/**
 * HowItWorksSection Component
 * Four AI model steps — no data flow pipeline diagram, clean card design
 */

'use client';

import React from 'react';
import { HowItWorksContent } from '@/lib/landing-page-types';

interface HowItWorksSectionProps {
  content: HowItWorksContent;
}

export const HowItWorksSection = React.forwardRef<
  HTMLElement,
  HowItWorksSectionProps
>(({ content }, ref) => {
  return (
    <section
      ref={ref}
      className="relative py-16 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900 overflow-hidden"
      aria-labelledby="how-it-works-title"
    >
      {/* Background accent */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">How It Works</span>
          </div>
        </div>

        <h2
          id="how-it-works-title"
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-foreground"
        >
          {content.title}
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12 sm:mb-16 px-4">
          Our safety pipeline combines four specialized AI models to ensure every
          prescription is safe, effective, and evidence-based.
        </p>

        {/* Pipeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="relative p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 group card-gradient-border"
              >
                {/* Step Number + Icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-base font-bold text-white">
                      {step.number}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <Icon className="h-7 w-7 text-indigo-500" aria-hidden="true" />
                  </div>
                </div>

                {/* Step Title */}
                <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>

                {/* Step Description */}
                <p className="text-sm sm:text-base text-muted-foreground mb-4 leading-relaxed">{step.description}</p>

                {/* AI Model Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {step.modelName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

HowItWorksSection.displayName = 'HowItWorksSection';
