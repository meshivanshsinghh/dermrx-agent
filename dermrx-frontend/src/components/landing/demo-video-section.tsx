"use client";

import { useRef, useState, useEffect } from 'react';
import { DemoVideoContent } from '@/lib/landing-page-types';
import { Play } from 'lucide-react';

interface DemoVideoSectionProps {
  content: DemoVideoContent;
}

export function DemoVideoSection({ content }: DemoVideoSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-16 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 overflow-hidden"
      id="demo"
      aria-labelledby="demo-video-heading"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 dot-pattern opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
            <Play className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">3-Minute Demo</span>
          </div>
        </div>

        <h2
          id="demo-video-heading"
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-foreground"
        >
          {content.title}
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-10 sm:mb-14 px-4 leading-relaxed">
          Watch DermRx Agent diagnose skin conditions, check drug interactions across complex medication
          lists, and generate safe, evidence-based treatment recommendations — all in under 60 seconds.
        </p>

        {/* YouTube Video Embed with glow effect */}
        <div className="video-glow rounded-2xl">
          <div
            className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-slate-900 dark:bg-slate-800"
            role="region"
            aria-label="Demo video player"
          >
            {!isInView ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center animate-pulse">
                  <Play className="h-10 w-10 text-indigo-400" aria-hidden="true" />
                </div>
              </div>
            ) : (
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/CIHco6gJCcw?rel=0"
                title="DermRx Agent Demo Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
