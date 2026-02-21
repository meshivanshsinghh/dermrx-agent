"use client";

import { useRef, useState, useEffect } from 'react';
import { DemoVideoContent } from '@/lib/landing-page-types';
import { Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoVideoSectionProps {
  content: DemoVideoContent;
}

export function DemoVideoSection({ content }: DemoVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

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

  const handleVideoError = () => {
    console.error('Video failed to load:', content.videoUrl);
    setVideoError(true);
  };

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true);
  };

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

        {/* Video Player with glow effect */}
        <div className="video-glow rounded-2xl">
          <div
            className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-slate-900 dark:bg-slate-800"
            role="region"
            aria-label="Demo video player"
          >
            {videoError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
                <div className="mb-6 h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Play className="h-10 w-10 text-indigo-400" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Demo Video Coming Soon</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-md">
                  The full 3-minute demo showcases the complete pipeline: image upload → diagnosis → medication check → safe recommendation.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-slate-600 text-slate-300 hover:bg-white/10"
                >
                  <a
                    href="https://www.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                    aria-label="Watch demo video on YouTube (opens in new tab)"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Watch on YouTube
                  </a>
                </Button>
              </div>
            ) : (
              <>
                {!isVideoLoaded && isInView && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center animate-pulse">
                      <Play className="h-10 w-10 text-indigo-400" aria-hidden="true" />
                    </div>
                  </div>
                )}

                {isInView && (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    controls
                    poster="/demo/video-poster.jpg"
                    onError={handleVideoError}
                    onLoadedData={handleVideoLoaded}
                    preload="metadata"
                    aria-label="DermRx Agent demonstration video"
                  >
                    <source src={content.videoUrl} type="video/mp4" />
                    <track kind="captions" src="/demo/captions.vtt" srcLang="en" label="English" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
