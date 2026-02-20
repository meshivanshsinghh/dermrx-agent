import re

response = """
**CLINICAL_SUMMARY:**

The patient presents with psoriasis. Based on the available information...

**RECOMMENDED_TREATMENT:**

calcipotriene, 0.0% topical cream

**REASONING:**

Psoriasis is a chronic inflammatory skin condition.

**PATIENT_EXPLANATION:**

We're going to start you on a topical cream...
"""

cleaned = response
cleaned = re.sub(r'\*\*', '', cleaned)     # **bold** markers
cleaned = re.sub(r'^---+\s*$', '', cleaned, flags=re.M)  # --- separators
cleaned = re.sub(r'^#+\s+', '', cleaned, flags=re.M)     # # headings
cleaned = cleaned.strip()

tags = [
    "CLINICAL_SUMMARY",
    "RECOMMENDED_TREATMENT",
    "REASONING",
    "PATIENT_EXPLANATION",
]
tag_pattern = "|".join(tags)

def extract(tag: str) -> str:
    m = re.search(
        rf"{tag}:\s*(.*?)(?=\n(?:{tag_pattern}):|$)",
        cleaned,
        re.S,
    )
    val = m.group(1).strip() if m else ""
    val = val.strip('*').strip()
    return val

print("SUMMARY:", repr(extract("CLINICAL_SUMMARY")))
print("TREATMENT:", repr(extract("RECOMMENDED_TREATMENT")))
print("REASON:", repr(extract("REASONING")))
print("PATIENT:", repr(extract("PATIENT_EXPLANATION")))
