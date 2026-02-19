import logging
import time
import threading
from dataclasses import dataclass, field

from app.utils.model_loader import is_mock_mode, get_medgemma

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 10          # keep last N user+assistant pairs
SESSION_TTL = 3600              # 1 hour 
CLEANUP_INTERVAL = 600          # run cleanup every 10 min
MAX_NEW_TOKENS = 384            # keep responses concise

@dataclass
class ChatMessage:
    role: str          
    content: str

@dataclass 
class ChatSession:
    session_id: str
    system_prompt: str
    history: list[ChatMessage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, ChatSession] = {}
        self._lock = threading.Lock()
        self._start_cleanup_timer()

    def get(self, session_id: str) -> ChatSession | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.last_active = time.time()
            return session

    def create(self, session_id: str, system_prompt: str) -> ChatSession:
        with self._lock:
            session = ChatSession(
                session_id=session_id,
                system_prompt=system_prompt,
            )
            self._sessions[session_id] = session
            return session

    def delete(self, session_id: str):
        with self._lock:
            self._sessions.pop(session_id, None)

    def _cleanup(self):
        now = time.time()
        with self._lock:
            expired = [
                sid for sid, s in self._sessions.items()
                if now - s.last_active > SESSION_TTL
            ]
            for sid in expired:
                del self._sessions[sid]
            if expired:
                logger.info(f"Chat session cleanup: evicted {len(expired)} sessions")

    def _start_cleanup_timer(self):
        def _run():
            self._cleanup()
            self._timer = threading.Timer(CLEANUP_INTERVAL, _run)
            self._timer.daemon = True
            self._timer.start()
        self._timer = threading.Timer(CLEANUP_INTERVAL, _run)
        self._timer.daemon = True
        self._timer.start()


# ── Global store instance ───────────────────────────────
_store = SessionStore()


# ── Context Builder ─────────────────────────────────────

def build_system_prompt(context: dict) -> str:
    """
    Compress the analysis result dict into a concise system prompt.
    Keeps it under ~600 tokens for fast inference.
    """
    parts = [
        "You are MedGemma, a clinical decision-support assistant for dermatology. "
        "You help physicians understand analysis results, drug safety evaluations, "
        "and treatment decisions. Answer concisely and accurately based on the "
        "case context below. If something is outside your scope, say so.\n"
    ]

    # Classification
    cls = context.get("classification")
    if cls:
        parts.append(
            f"DIAGNOSIS: {cls.get('display_name', 'N/A')} "
            f"(confidence: {cls.get('confidence_level', '?')}, "
            f"score: {cls.get('confidence', '?')}, "
            f"tier: {cls.get('tier', '?')})"
        )
        if cls.get("treatment_class"):
            parts.append(f"Treatment class: {cls['treatment_class']}")
        flags = cls.get("safety_flags", [])
        if flags:
            flag_names = [f.get("display_name", "") for f in flags]
            parts.append(f"Safety flags: {', '.join(flag_names)}")
        top = cls.get("top_scores", [])
        if top:
            diff = [f"{t['display_name']} ({t['score']:.3f})" for t in top[:5]]
            parts.append(f"Differential: {', '.join(diff)}")

    # Selected drug
    selected = context.get("selected_drug")
    if selected:
        parts.append(f"\nSELECTED DRUG: {selected}")

    # Drug evaluations
    evals = context.get("candidates_evaluated", [])
    if evals:
        eval_lines = []
        for ev in evals:
            status = ev.get("status", "?")
            name = ev.get("drug_name", "?")
            reason = ev.get("reason") or ""
            findings_count = len(ev.get("findings", []))
            line = f"  {name}: {status}"
            if reason:
                line += f" — {reason}"
            if findings_count:
                line += f" ({findings_count} findings)"
            eval_lines.append(line)

            # Include key findings inline
            for f in ev.get("findings", []):
                sev = f.get("severity", "")
                desc = f.get("description", "")
                ftype = f.get("finding_type", "")
                mgmt = f.get("management") or ""
                finding_line = f"    [{sev}] {ftype}: {desc}"
                if mgmt:
                    finding_line += f" | Management: {mgmt}"
                eval_lines.append(finding_line)

        parts.append("\nDRUG EVALUATIONS:\n" + "\n".join(eval_lines))

    # Clinical report
    report = context.get("report")
    if report:
        parts.append(f"\nCLINICAL SUMMARY: {report.get('clinical_summary', '')}")
        parts.append(f"RECOMMENDED TREATMENT: {report.get('recommended_treatment', '')}")
        parts.append(f"REASONING: {report.get('reasoning_trace', '')}")
        parts.append(f"PATIENT EXPLANATION: {report.get('patient_explanation', '')}")
        rejected = report.get("rejected_drugs", [])
        if rejected:
            rej_lines = []
            for r in rejected:
                if isinstance(r, dict):
                    rej_lines.append(f"  {r.get('drug', '?')}: {r.get('reason', '?')}")
                else:
                    rej_lines.append(f"  {r}")
            parts.append("REJECTED DRUGS:\n" + "\n".join(rej_lines))

    return "\n".join(parts)


# ── Chat Service ─────────────────────────────────────────

class ChatService:

    def chat(
        self,
        session_id: str,
        message: str,
        context: dict | None = None,
    ) -> str:
        """
        Process a chat message. Creates session on first call (context required).
        Returns the assistant response.
        """
        # Get or create session
        session = _store.get(session_id)
        if session is None:
            if context is None:
                return "No analysis context provided. Please run an analysis first."
            system_prompt = build_system_prompt(context)
            session = _store.create(session_id, system_prompt)
            logger.info(
                f"Chat session created: {session_id} "
                f"(system prompt: {len(system_prompt)} chars)"
            )

        # Append user message
        session.history.append(ChatMessage(role="user", content=message))

        # Trim history to max turns (keep system prompt + last N exchanges)
        if len(session.history) > MAX_HISTORY_TURNS * 2:
            session.history = session.history[-(MAX_HISTORY_TURNS * 2):]

        # Generate response
        if is_mock_mode():
            answer = self._mock_generate(session)
        else:
            answer = self._real_generate(session)

        # Append assistant response
        session.history.append(ChatMessage(role="assistant", content=answer))

        return answer

    def clear_session(self, session_id: str):
        _store.delete(session_id)

    # ── Real MedGemma inference ──────────────────────

    def _real_generate(self, session: ChatSession) -> str:
        model, tokenizer = get_medgemma()

        # Build messages list for chat template
        messages = [
            {"role": "user", "content": session.system_prompt + "\n\nPlease acknowledge you understand this case context. From now on, answer questions about it."},
            {"role": "assistant", "content": "Understood. I have the full case context including diagnosis, drug evaluations, and clinical report. Ask me anything about this case."},
        ]
        for msg in session.history:
            messages.append({"role": msg.role, "content": msg.content})

        formatted = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        input_ids = tokenizer(formatted, return_tensors="pt").to(model.device)

        outputs = model.generate(
            **input_ids,
            max_new_tokens=MAX_NEW_TOKENS,
            temperature=0.3,
            do_sample=True,
            repetition_penalty=1.1,
        )
        response = tokenizer.decode(
            outputs[0][len(input_ids["input_ids"][0]):],
            skip_special_tokens=True,
        ).strip()

        logger.info(f"Chat response ({session.session_id}): {len(response)} chars")
        return response

    # ── Mock generation (pattern-matched) ────────────

    def _mock_generate(self, session: ChatSession) -> str:
        """Pattern-matched mock responses using context from system prompt."""
        if not session.history:
            return "I'm ready to help. What would you like to know about this case?"

        last_msg = session.history[-1].content.lower()
        ctx = session.system_prompt

        # Extract key info from system prompt for mock responses
        import re
        
        diagnosis_match = re.search(r"DIAGNOSIS:\s*(.+?)(?:\n|$)", ctx)
        diagnosis = diagnosis_match.group(1).strip() if diagnosis_match else "the diagnosed condition"
        
        selected_match = re.search(r"SELECTED DRUG:\s*(.+?)(?:\n|$)", ctx)
        selected_drug = selected_match.group(1).strip() if selected_match else "the selected drug"
        
        summary_match = re.search(r"CLINICAL SUMMARY:\s*(.+?)(?:\n[A-Z]|$)", ctx, re.S)
        summary = summary_match.group(1).strip() if summary_match else ""
        
        reasoning_match = re.search(r"REASONING:\s*(.+?)(?:\nPATIENT|$)", ctx, re.S)
        reasoning = reasoning_match.group(1).strip() if reasoning_match else ""
        
        patient_match = re.search(r"PATIENT EXPLANATION:\s*(.+?)(?:\nREJECTED|$)", ctx, re.S)
        patient_exp = patient_match.group(1).strip() if patient_match else ""

        # Pattern matching — order matters (more specific patterns first)
        if ("patient" in last_msg and any(w in last_msg for w in ["explain", "simple", "plain", "layman"])) or "patient explanation" in last_msg:
            if patient_exp:
                return f"**Patient-Friendly Explanation:**\n\n{patient_exp}"
            return "The analysis found a skin condition and identified a safe treatment option considering your current medications."

        if any(w in last_msg for w in ["explain", "diagnosis", "condition", "what is"]):
            return (
                f"**{diagnosis}**\n\n"
                f"{summary}\n\n"
                "Feel free to ask about the treatment selection, drug safety, or anything else about this case."
            )

        if any(w in last_msg for w in ["why", "selected", "chosen", "recommend", "drug select"]):
            return (
                f"**Selected Drug: {selected_drug}**\n\n"
                f"{reasoning}\n\n"
                "Would you like to know about alternative treatments or specific safety concerns?"
            )

        if any(w in last_msg for w in ["alternative", "other treatment", "other drug", "options"]):
            # Extract evaluations from system prompt
            eval_match = re.findall(r"  (\w[\w\s]*?):\s*(SAFE|CAUTION|REJECTED)(?:\s*—\s*(.+?))?(?:\n|$)", ctx)
            if eval_match:
                lines = []
                for name, status, reason in eval_match:
                    if name.strip().lower() != selected_drug.lower():
                        emoji = "✅" if status == "SAFE" else ("⚠️" if status == "CAUTION" else "🚫")
                        line = f"- {emoji} **{name.strip()}** ({status})"
                        if reason:
                            line += f" — {reason}"
                        lines.append(line)
                if lines:
                    return "**Alternative Treatment Options:**\n\n" + "\n".join(lines) + f"\n\n_{selected_drug} was selected as the optimal choice after safety evaluation._"
            return f"Based on the evaluation, {selected_drug} was the best option. The other candidates had safety concerns with the patient's medications."

        if any(w in last_msg for w in ["risk", "safety", "danger", "warning", "concern"]):
            # Extract findings
            findings = re.findall(r"\[(Major|Moderate|Minor)\]\s*(\w+):\s*(.+?)(?:\n|$)", ctx)
            if findings:
                lines = []
                for sev, ftype, desc in findings:
                    emoji = "🔴" if sev == "Major" else ("🟡" if sev == "Moderate" else "🟢")
                    lines.append(f"- {emoji} **{sev}** ({ftype}): {desc.strip()}")
                return "**Safety Findings for this Case:**\n\n" + "\n".join(lines)
            return "No major safety concerns were identified for the selected treatment. The drug was cleared through DDI and molecular toxicity checks."

        if any(w in last_msg for w in ["interaction", "ddi", "drug interaction"]):
            findings = re.findall(r"\[(Major|Moderate|Minor)\]\s*DDI_\w+:\s*(.+?)(?:\n|$)", ctx)
            if findings:
                lines = [f"- **{sev}**: {desc.strip()}" for sev, desc in findings]
                return "**Drug Interactions Found:**\n\n" + "\n".join(lines)
            return "No significant drug-drug interactions were identified for the selected treatment."

        if any(w in last_msg for w in ["toxicity", "molecular", "txgemma"]):
            findings = re.findall(r"\[(Major|Moderate)\]\s*TOXICITY:\s*(.+?)(?:\n|$)", ctx)
            if findings:
                lines = [f"- **{sev}**: {desc.strip()}" for sev, desc in findings]
                return "**Molecular Toxicity Flags (TxGemma):**\n\n" + "\n".join(lines)
            return "No molecular toxicity concerns were flagged by TxGemma for the selected drug."

        if any(w in last_msg for w in ["food", "diet", "eat"]):
            findings = re.findall(r"\[(\w+)\]\s*FOOD_\w+:\s*(.+?)(?:\n|$)", ctx)
            if findings:
                lines = [f"- **{sev}**: {desc.strip()}" for sev, desc in findings]
                return "**Food Interactions:**\n\n" + "\n".join(lines) + "\n\nPatients should be counseled about these dietary considerations."
            return "No specific food interactions were flagged for this case."

        if any(w in last_msg for w in ["dose", "dosage", "how much", "how to take"]):
            rec_match = re.search(r"RECOMMENDED TREATMENT:\s*(.+?)(?:\n|$)", ctx)
            if rec_match:
                return f"**Recommended Treatment:**\n\n{rec_match.group(1).strip()}\n\n_Please verify dosing against current prescribing guidelines._"
            return "Please refer to current prescribing guidelines for exact dosing information."

        if any(w in last_msg for w in ["summary", "summarize", "overview", "recap"]):
            return (
                f"**Case Summary:**\n\n"
                f"**Diagnosis:** {diagnosis}\n"
                f"**Selected Treatment:** {selected_drug}\n\n"
                f"{summary}\n\n"
                f"_Ask me about specific aspects — drug safety, alternatives, patient explanation, or risk factors._"
            )

        # Fallback
        return (
            f"Based on this case ({diagnosis}, treated with {selected_drug}):\n\n"
            f"{summary[:200]}{'...' if len(summary) > 200 else ''}\n\n"
            "I can help with:\n"
            "- Diagnosis explanation\n"
            "- Drug selection reasoning\n"
            "- Alternative treatments\n"
            "- Safety & risk factors\n"
            "- Patient-friendly explanation\n"
            "- Drug interactions & toxicity details\n\n"
            "What would you like to know?"
        )
