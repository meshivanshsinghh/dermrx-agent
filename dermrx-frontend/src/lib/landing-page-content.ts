/**
 * Content configuration for the DermRx Landing Page
 * All copy, stats, scenarios, and comparison features
 */

import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Eye,
  FileText,
  Pill,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { LandingPageContent } from './landing-page-types';

export const landingPageContent: LandingPageContent = {
  hero: {
    headline: 'Safe prescriptions for every patient, every time.',
    subheadline:
      'An AI agent that diagnoses skin conditions and finds safe, evidence-based treatments — even when a patient is on eight medications from three different specialists.',
    primaryCTA: 'Watch the demo',
    secondaryCTA: 'Get Started',
  },

  demoVideo: {
    title: 'See It In Action',
    videoUrl: '/demo/dermrx-demo.mp4', // Placeholder - update with actual video URL
    caption:
      'Watch how DermRx Agent analyzes a patient case, checks for drug interactions, and recommends safe treatment options.',
    timestamps: [
      {
        time: 0,
        label: 'Introduction',
        description: 'Overview of the DermRx Agent',
      },
      {
        time: 45,
        label: 'Skin Diagnosis',
        description: 'AI-powered image analysis with MedSigLIP',
      },
      {
        time: 120,
        label: 'Drug Interaction Check',
        description: 'Polypharmacy safety analysis with DDInter',
      },
      {
        time: 180,
        label: 'Treatment Recommendation',
        description: 'Evidence-based prescription with TxGemma',
      },
      {
        time: 240,
        label: 'Safety Verification',
        description: 'Molecular toxicity analysis with MedGemma',
      },
    ],
  },

  problem: {
    intro:
      'When specialists work in silos, patients pay the price. Medication lists are incomplete, interactions go unchecked, and adverse events become inevitable.',
    stats: [
      {
        value: '1.5M+',
        label: 'ED visits per year',
        description: 'Emergency department visits due to adverse drug events in the US',
        icon: AlertTriangle,
      },
      {
        value: '43%',
        label: 'of Americans 65+',
        description: 'Take 5 or more medications from multiple specialists',
        icon: Users,
      },
      {
        value: 'Up to 67%',
        label: 'medication history errors',
        description: 'Of patients have incomplete or inaccurate medication records',
        icon: FileText,
      },
    ],
  },

  howItWorks: {
    title: 'Four AI models. One safety pipeline.',
    steps: [
      {
        number: 1,
        title: 'Skin Diagnosis',
        description:
          'MedSigLIP analyzes patient images to identify skin conditions with high accuracy, providing the foundation for treatment decisions.',
        modelName: 'MedSigLIP',
        icon: Eye,
      },
      {
        number: 2,
        title: 'Drug Interaction Check',
        description:
          'DDInter evaluates the patient\'s complete medication list to identify potential drug-drug interactions and contraindications.',
        modelName: 'DDInter',
        icon: Shield,
      },
      {
        number: 3,
        title: 'Treatment Recommendation',
        description:
          'TxGemma generates evidence-based treatment recommendations tailored to the patient\'s diagnosis and medical history.',
        modelName: 'TxGemma',
        icon: Pill,
      },
      {
        number: 4,
        title: 'Safety Verification',
        description:
          'MedGemma performs molecular toxicity analysis to verify the safety of recommended treatments at the chemical level.',
        modelName: 'MedGemma',
        icon: CheckCircle2,
      },
    ],
    diagramType: 'mermaid',
  },

  scenarios: [
    {
      id: 'warfarin-patient',
      title: 'Warfarin Patient',
      subtitle: 'High-risk drug interaction',
      description:
        'Patient on warfarin presents with acne. DermRx identifies the anticoagulant interaction risk and recommends topical retinoids instead of oral antibiotics.',
      patientProfile: '45-year-old on warfarin for atrial fibrillation',
      expectedOutcome:
        'Safe topical treatment avoiding dangerous drug-drug interactions',
      tags: ['Drug Interaction', 'Polypharmacy', 'Safety'],
      icon: Shield,
    },
    {
      id: 'polypharmacy-elder',
      title: 'Polypharmacy Elder',
      subtitle: 'Complex medication regimen',
      description:
        'Elderly patient on 8 medications from 3 specialists presents with eczema. DermRx cross-checks all medications and recommends treatments compatible with the entire regimen.',
      patientProfile: '72-year-old with hypertension, diabetes, and heart disease',
      expectedOutcome:
        'Comprehensive safety check across all medications with compatible treatment',
      tags: ['Polypharmacy', 'Elderly', 'Multi-specialist'],
      icon: Users,
    },
    {
      id: 'acne-doxycycline',
      title: 'Acne Patient on Doxycycline',
      subtitle: 'Molecular toxicity analysis',
      description:
        'Patient with severe acne being considered for doxycycline. DermRx performs molecular toxicity analysis to verify safety and provides evidence-based dosing.',
      patientProfile: '28-year-old with no known drug allergies',
      expectedOutcome:
        'Molecular-level safety verification with optimized treatment plan',
      tags: ['Toxicity Analysis', 'Evidence-based', 'Dosing'],
      icon: Activity,
    },
  ],

  comparison: {
    title: 'How DermRx Agent Compares',
    features: [
      {
        name: 'Skin diagnosis from images',
        dermrxAgent: true,
        currentDermAI: true,
        highlight: false,
      },
      {
        name: 'Treatment recommendation',
        dermrxAgent: true,
        currentDermAI: true,
        highlight: false,
      },
      {
        name: 'Drug interaction checking',
        dermrxAgent: true,
        currentDermAI: false,
        highlight: true,
      },
      {
        name: 'Polypharmacy safety analysis',
        dermrxAgent: true,
        currentDermAI: false,
        highlight: true,
      },
      {
        name: 'Molecular toxicity analysis',
        dermrxAgent: true,
        currentDermAI: false,
        highlight: true,
      },
      {
        name: 'Visible reasoning trace',
        dermrxAgent: true,
        currentDermAI: 'Limited',
        highlight: true,
      },
      {
        name: 'Multi-specialist coordination',
        dermrxAgent: true,
        currentDermAI: false,
        highlight: true,
      },
      {
        name: 'Evidence-based citations',
        dermrxAgent: true,
        currentDermAI: 'Partial',
        highlight: false,
      },
    ],
  },

  architecture: {
    headline: 'Four AI models. One safety pipeline.',
    callouts: [
      {
        title: 'Agentic Behavior',
        description:
          'The system autonomously orchestrates multiple AI models, making decisions about which analyses to run and how to combine their outputs for optimal patient safety.',
        icon: Brain,
      },
      {
        title: 'Complete Traceability',
        description:
          'Every recommendation includes a full reasoning trace showing which models were consulted, what data was analyzed, and why specific decisions were made.',
        icon: FileText,
      },
      {
        title: 'Efficient Pipeline',
        description:
          'Parallel processing and intelligent caching ensure fast response times even when analyzing complex polypharmacy cases with multiple drug interactions.',
        icon: Zap,
      },
    ],
    diagramUrl: '/pipeline/architecture-diagram.png', // Placeholder - update with actual diagram
  },

  footer: {
    builtBy: 'Built by Shivansh for the MedGemma Impact Challenge 2026',
    disclaimer:
      'This is a research demonstration and not intended for clinical use. Always consult with qualified healthcare professionals for medical decisions.',
    links: [
      {
        label: 'Kaggle Notebooks',
        url: 'https://www.kaggle.com/meshivanshsinghh/code',
        external: true,
      },
      {
        label: 'GitHub',
        url: 'https://github.com/meshivanshsinghh/dermrx-agent',
        external: true,
      },
      {
        label: 'Linkedin',
        url: 'https://www.linkedin.com/in/shivanshsinghh/',
        external: true,
      },
    ],
  },
};
