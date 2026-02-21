/**
 * Footer Section Component
 * Premium footer with gradient accent and structured links
 */

import { FooterLink } from '@/lib/landing-page-types';
import { ExternalLink, Stethoscope } from 'lucide-react';

export interface FooterSectionProps {
  builtBy: string;
  disclaimer: string;
  links: FooterLink[];
}

export function FooterSection({
  builtBy,
  disclaimer,
  links,
}: FooterSectionProps) {
  return (
    <footer
      className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-300 overflow-hidden"
      role="contentinfo"
      aria-label="Site footer"
    >
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">DermRx Agent</div>
              <div className="text-xs text-slate-500">{builtBy}</div>
            </div>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-5 sm:gap-6">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                className="text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                aria-label={link.external ? `${link.label} (opens in new tab)` : link.label}
              >
                {link.label}
                {link.external && <ExternalLink className="h-3 w-3" aria-hidden="true" />}
              </a>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-800 mb-8" />

        {/* Disclaimer + Data sources */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            {disclaimer}
          </div>
          <div className="text-xs text-slate-600">
            Data: DDInter · MED-RT · PubChem · HAM10000
          </div>
        </div>


      </div>
    </footer>
  );
}
