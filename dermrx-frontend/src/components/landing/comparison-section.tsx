/**
 * Comparison Section Component
 * Premium comparison table with enhanced styling
 */

import { Check, X } from 'lucide-react';
import { ComparisonFeature } from '@/lib/landing-page-types';

export interface ComparisonSectionProps {
  title: string;
  features: ComparisonFeature[];
}

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <div className="flex items-center justify-center">
        <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Supported" />
        </div>
      </div>
    ) : (
      <div className="flex items-center justify-center">
        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <X className="h-4 w-4 text-slate-400 dark:text-slate-600" aria-label="Not supported" />
        </div>
      </div>
    );
  }
  return <span className="text-sm text-center block text-amber-600 dark:text-amber-400 font-medium">{value}</span>;
}

export function ComparisonSection({ title, features }: ComparisonSectionProps) {
  return (
    <section
      className="relative py-16 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950 overflow-hidden"
      aria-labelledby="comparison-heading"
    >
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Comparison</span>
          </div>
        </div>

        <h2
          id="comparison-heading"
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 text-foreground"
        >
          {title}
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          DermRx is diagnose + prescribe safely — a multi-model safety pipeline that produces explainable, clinician-ready recommendations.
        </p>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" role="table" aria-label="Feature comparison">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th scope="col" className="text-left p-4 sm:p-5 font-semibold text-foreground text-sm">Feature</th>
                  <th scope="col" className="text-center p-4 sm:p-5 font-semibold text-sm">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                      DermRx Agent
                    </span>
                  </th>
                  <th scope="col" className="text-center p-4 sm:p-5 font-semibold text-sm text-muted-foreground">Current Derm AI</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr
                    key={index}
                    className={`border-b border-slate-100 dark:border-slate-800/50 last:border-b-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${feature.highlight ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''
                      }`}
                  >
                    <td className="p-4 sm:p-5">
                      <span className="text-foreground font-medium">{feature.name}</span>
                    </td>
                    <td className="p-4 sm:p-5">
                      <FeatureValue value={feature.dermrxAgent} />
                    </td>
                    <td className="p-4 sm:p-5">
                      <FeatureValue value={feature.currentDermAI} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800" role="list">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-4 ${feature.highlight ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}
                role="listitem"
              >
                <div className="font-medium mb-3 text-foreground">
                  {feature.name}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1.5 font-medium">DermRx Agent</div>
                    <div className="flex justify-start"><FeatureValue value={feature.dermrxAgent} /></div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1.5 font-medium">Current Derm AI</div>
                    <div className="flex justify-start"><FeatureValue value={feature.currentDermAI} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
