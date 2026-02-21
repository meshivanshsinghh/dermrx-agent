/**
 * LandingPage Component
 * Main container that orchestrates all landing page sections and manages scroll behavior
 */

'use client';

import { useRef } from 'react';
import { landingPageContent } from '@/lib/landing-page-content';
import {
  HeroSection,
  DemoVideoSection,
  ProblemSection,
  HowItWorksSection,
  ComparisonSection,
  ArchitectureSection,
  FooterSection,
} from './index';

/**
 * Scrolls smoothly to a target section
 */
function scrollToSection(ref: React.RefObject<HTMLDivElement | null>): void {
  if (!ref.current) {
    console.warn('Section ref is null, cannot scroll');
    return;
  }
  ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const architectureRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const handleWatchDemo = () => scrollToSection(demoRef);

  return (
    <main className="min-h-screen bg-background overflow-x-hidden" role="main" id="main-content">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      <div ref={heroRef}>
        <HeroSection
          headline={landingPageContent.hero.headline}
          subheadline={landingPageContent.hero.subheadline}
          primaryCTA={landingPageContent.hero.primaryCTA}
          secondaryCTA={landingPageContent.hero.secondaryCTA}
          onWatchDemo={handleWatchDemo}
        />
      </div>

      <div ref={demoRef}>
        <DemoVideoSection content={landingPageContent.demoVideo} />
      </div>

      <div ref={problemRef}>
        <ProblemSection
          intro={landingPageContent.problem.intro}
          stats={landingPageContent.problem.stats}
        />
      </div>

      <div ref={howItWorksRef}>
        <HowItWorksSection content={landingPageContent.howItWorks} />
      </div>

      <div ref={comparisonRef}>
        <ComparisonSection
          title={landingPageContent.comparison.title}
          features={landingPageContent.comparison.features}
        />
      </div>

      <div ref={architectureRef}>
        <ArchitectureSection
          headline={landingPageContent.architecture.headline}
          callouts={landingPageContent.architecture.callouts}
        />
      </div>

      <div ref={footerRef}>
        <FooterSection
          builtBy={landingPageContent.footer.builtBy}
          disclaimer={landingPageContent.footer.disclaimer}
          links={landingPageContent.footer.links}
        />
      </div>
    </main>
  );
}
