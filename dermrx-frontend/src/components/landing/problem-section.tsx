/**
 * Problem Section Component
 * Presents the healthcare fragmentation problem with visually enhanced stat cards
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { StatCard } from '@/lib/landing-page-types';

export interface ProblemSectionProps {
  intro: string;
  stats: StatCard[];
}

function useScrollAnimation(threshold: number = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { isVisible, elementRef };
}

export function ProblemSection({ intro, stats }: ProblemSectionProps) {
  const { isVisible, elementRef } = useScrollAnimation(0.2);

  return (
    <section
      className="relative py-16 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950 overflow-hidden"
      aria-labelledby="problem-heading"
    >
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">The Problem</span>
          </div>
        </div>

        <h2
          id="problem-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-4 text-foreground"
        >
          Fragmented care is hurting patients
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12 sm:mb-16 px-4 leading-relaxed">
          {intro}
        </p>

        <div
          ref={elementRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          role="list"
          aria-label="Healthcare statistics"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`card-gradient-border p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-500 ${isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                  }`}
                style={{ transitionDelay: `${index * 150}ms` }}
                role="listitem"
              >
                {Icon && (
                  <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-5">
                    <Icon className="h-6 w-6 text-red-500" aria-hidden="true" />
                  </div>
                )}
                <div className="text-3xl sm:text-4xl font-bold mb-2 text-foreground" aria-label={`${stat.value} ${stat.label}`}>
                  {stat.value}
                </div>
                <div className="font-semibold mb-2 text-foreground">{stat.label}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {stat.description}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8 italic max-w-2xl mx-auto">
          These numbers show scale and preventability — the entry point is dermatology, the pipeline is generalizable.
        </p>
      </div>
    </section>
  );
}
