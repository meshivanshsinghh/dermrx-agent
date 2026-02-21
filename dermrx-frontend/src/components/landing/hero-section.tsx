/**
 * Hero Section Component
 * Stunning hero with animated gradient mesh background, floating elements, and glassmorphism
 */

'use client';

import { Button } from '@/components/ui/button';
import { Play, ArrowRight, Shield, Pill, Stethoscope, Activity } from 'lucide-react';
import Link from 'next/link';

export interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
  onWatchDemo: () => void;
}

export function HeroSection({
  headline,
  subheadline,
  primaryCTA,
  onWatchDemo,
}: HeroSectionProps) {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 overflow-hidden"
      aria-labelledby="hero-heading"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 50%, #020617 100%)' }}
    >
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <div className="hero-orb hero-orb-4" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Floating medical icons */}
      <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
        <div className="hero-float hero-float-1">
          <Shield className="h-6 w-6 text-indigo-400/20" />
        </div>
        <div className="hero-float hero-float-2">
          <Pill className="h-5 w-5 text-purple-400/20" />
        </div>
        <div className="hero-float hero-float-3">
          <Stethoscope className="h-7 w-7 text-blue-400/15" />
        </div>
        <div className="hero-float hero-float-4">
          <Activity className="h-5 w-5 text-cyan-400/20" />
        </div>
        <div className="hero-float hero-float-5">
          <Shield className="h-4 w-4 text-violet-400/15" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-medium text-indigo-200 tracking-wide">
            Built for MedGemma Impact Challenge 2026
          </span>
        </div>

        {/* Headline */}
        <h1
          id="hero-heading"
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-white tracking-tight"
        >
          <span className="inline-block">Safe prescriptions for</span>
          <br />
          <span className="hero-gradient-text">every patient, every time.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto px-4 leading-relaxed">
          {subheadline}
        </p>

        {/* CTA Buttons */}
        <nav aria-label="Primary navigation" className="flex flex-row gap-4 justify-center pt-4">
          <Button
            size="lg"
            onClick={onWatchDemo}
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 transition-all duration-300 text-sm sm:text-base px-5 sm:px-8 py-5 sm:py-6 rounded-xl"
            aria-label="Watch the demo video"
          >
            <Play className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            {primaryCTA}
          </Button>

          <Button
            size="lg"
            className="gap-2 bg-white text-slate-900 hover:bg-slate-100 border-0 shadow-lg transition-all duration-300 text-sm sm:text-base px-5 sm:px-8 py-5 sm:py-6 rounded-xl font-semibold"
            aria-label="Get started with DermRx Agent"
            asChild
          >
            <Link href="/app">
              Get Started
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </Link>
          </Button>
        </nav>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 pt-8 opacity-60">
          <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
            <Shield className="h-4 w-4" />
            <span>4 AI Models</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
            <Activity className="h-4 w-4" />
            <span>Drug Safety Pipeline</span>
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
            <Stethoscope className="h-4 w-4" />
            <span>Evidence-Based</span>
          </div>
        </div>
      </div>
    </section>
  );
}
