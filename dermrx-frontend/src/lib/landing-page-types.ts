/**
 * Type definitions for the DermRx Landing Page
 * These interfaces define the data models for all landing page content
 */

import { LucideIcon } from 'lucide-react';

/**
 * Main landing page content structure
 */
export interface LandingPageContent {
  hero: HeroContent;
  demoVideo: DemoVideoContent;
  problem: ProblemContent;
  howItWorks: HowItWorksContent;
  scenarios: DemoScenario[];
  comparison: ComparisonContent;
  architecture: ArchitectureContent;
  footer: FooterContent;
}

/**
 * Hero section content
 */
export interface HeroContent {
  headline: string;
  subheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
}

/**
 * Demo video section content
 */
export interface DemoVideoContent {
  title: string;
  videoUrl: string;
  caption: string;
  timestamps: TimestampLink[];
}

/**
 * Timestamp link for video navigation
 */
export interface TimestampLink {
  time: number; // seconds
  label: string;
  description: string;
}

/**
 * Problem section content
 */
export interface ProblemContent {
  intro: string;
  stats: StatCard[];
}

/**
 * Stat card data
 */
export interface StatCard {
  value: string;
  label: string;
  description: string;
  icon?: LucideIcon;
}

/**
 * How It Works section content
 */
export interface HowItWorksContent {
  title: string;
  steps: PipelineStep[];
  diagramType: 'mermaid' | 'image';
}

/**
 * Pipeline step data
 */
export interface PipelineStep {
  number: number;
  title: string;
  description: string;
  modelName: string;
  icon: LucideIcon;
}

/**
 * Demo scenario data
 */
export interface DemoScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  patientProfile: string;
  expectedOutcome: string;
  tags: string[];
  icon: LucideIcon;
}

/**
 * Comparison section content
 */
export interface ComparisonContent {
  title: string;
  features: ComparisonFeature[];
}

/**
 * Comparison feature row
 */
export interface ComparisonFeature {
  name: string;
  dermrxAgent: boolean | string;
  currentDermAI: boolean | string;
  highlight?: boolean;
}

/**
 * Architecture section content
 */
export interface ArchitectureContent {
  headline: string;
  callouts: TechnicalCallout[];
  diagramUrl?: string;
}

/**
 * Technical callout data
 */
export interface TechnicalCallout {
  title: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Footer section content
 */
export interface FooterContent {
  builtBy: string;
  disclaimer: string;
  links: FooterLink[];
}

/**
 * Footer link data
 */
export interface FooterLink {
  label: string;
  url: string;
  external: boolean;
}
