/**
 * Root Landing Page
 * Displays the DermRx Agent landing page at /
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DermRx Agent - Safe prescriptions for every patient',
  description:
    'An AI agent that diagnoses skin conditions and finds safe, evidence-based treatments — even when a patient is on eight medications from three different specialists.',
  openGraph: {
    title: 'DermRx Agent - Safe prescriptions for every patient',
    description:
      'AI-powered dermatology agent with drug interaction checking and polypharmacy safety analysis.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DermRx Agent - Safe prescriptions for every patient',
    description:
      'AI-powered dermatology agent with drug interaction checking and polypharmacy safety analysis.',
  },
};

// Dynamic import for client component
import { LandingPage } from '@/components/landing';

export default function HomePage() {
  return <LandingPage />;
}