/**
 * Architecture Section Component
 * Video walkthrough on left + architecture writeup on right, with technical callout cards below
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Play } from 'lucide-react';
import { TechnicalCallout } from '@/lib/landing-page-types';

export interface ArchitectureSectionProps {
  headline: string;
  callouts: TechnicalCallout[];
  diagramUrl?: string;
}

export function ArchitectureSection({
  headline,
  callouts,
}: ArchitectureSectionProps) {
  const [videoError, setVideoError] = useState(true); // Default to placeholder until video is provided

  return (
    <section
      className="relative py-16 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 overflow-hidden"
      aria-labelledby="architecture-heading"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative z-10">
        <h2
          id="architecture-heading"
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-foreground"
        >
          {headline}
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12 sm:mb-16 px-4">
          A transparent, traceable AI system designed for safety-critical healthcare decisions
        </p>

        {/* Two-column: Video + Writeup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12 sm:mb-16">
          {/* Left: Video */}
          <div>
            <div className="video-glow rounded-2xl">
              <div
                className="relative aspect-video rounded-2xl overflow-hidden shadow-xl bg-slate-900"
                role="region"
                aria-label="Architecture walkthrough video"
              >
                {videoError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-center">
                    <div className="mb-4 h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <Play className="h-8 w-8 text-indigo-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Architecture Walkthrough</h3>
                    <p className="text-sm text-slate-400 max-w-xs">
                      90-second overview of the multi-model safety pipeline
                    </p>
                  </div>
                ) : (
                  <video
                    className="w-full h-full object-cover"
                    controls
                    onError={() => setVideoError(true)}
                    preload="metadata"
                    aria-label="Architecture walkthrough video"
                  >
                    <source src="/demo/architecture-walkthrough.mp4" type="video/mp4" />
                  </video>
                )}
              </div>
            </div>
          </div>

          {/* Right: Architecture Writeup */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                Multi-Model Safety Pipeline
              </h3>
              <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">MedSigLIP</strong> classifies skin lesions from
                  uploaded clinical photos, routing low-confidence cases to human review while providing
                  high-accuracy diagnoses for the treatment pipeline.
                </p>
                <p>
                  <strong className="text-foreground">MedGemma</strong> generates treatment candidates
                  based on the diagnosis, considering the patient&apos;s full medication history and
                  comorbidities to propose evidence-based options.
                </p>
                <p>
                  <strong className="text-foreground">DDInter + TxGemma</strong> run parallel safety
                  analyses — DDInter checks drug-drug and drug-disease interactions while TxGemma evaluates
                  molecular toxicity and photosensitivity risks.
                </p>
                <p>
                  <strong className="text-foreground">MedGemma synthesizes</strong> a final, traceable
                  recommendation with ranked treatment options, rejected candidates with reasoning,
                  monitoring instructions, and citation links.
                </p>
              </div>
            </div>

            {/* Performance highlight */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                End-to-end in under 60 seconds on a single T4 GPU
              </span>
            </div>
          </div>
        </div>

        {/* Technical Callouts */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10"
          role="list"
          aria-label="Technical features"
        >
          {callouts.map((callout, index) => {
            const Icon = callout.icon;
            return (
              <Card
                key={index}
                className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 card-gradient-border"
                role="listitem"
              >
                <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-500 mb-3 sm:mb-4" aria-hidden="true" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">{callout.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {callout.description}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Documentation Links */}
        <nav aria-label="External resources" className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
            asChild
          >
            <a
              href="https://www.kaggle.com/meshivanshsinghh/code"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Kaggle Notebooks (opens in new tab)"
            >
              View Kaggle Notebooks
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
            asChild
          >
            <a
              href="https://www.kaggle.com/competitions/med-gemma-impact-challenge/writeups/dermrx-agent"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View MedGemma Writeup"
            >
              View MedGemma Writeup
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </nav>
      </div>
    </section>
  );
}
