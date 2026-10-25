import { BriefcaseBusiness, Database, ScanSearch } from 'lucide-react';
import './InvestigationFlowAnimation.css';

const motionPaths = [
  'M88 82 C210 82 260 105 469 120 C590 134 670 82 850 82',
  'M88 158 C210 158 260 137 469 120 C590 103 670 158 850 158',
  'M170 48 C270 48 313 90 469 120 C590 180 685 192 850 192',
  'M170 192 C270 192 313 150 469 120 C590 60 685 48 850 48',
];

const stages = [
  {
    number: '01',
    title: 'Transaction activity',
    detail: 'Connected records form a reviewable network.',
    Icon: Database,
    tone: 'flow-stage--data',
  },
  {
    number: '02',
    title: 'Anomaly screening',
    detail: 'Isolation Forest surfaces unusual records.',
    Icon: ScanSearch,
    tone: 'flow-stage--model',
  },
  {
    number: '03',
    title: 'Analyst case',
    detail: 'An analyst checks signals and records findings.',
    Icon: BriefcaseBusiness,
    tone: 'flow-stage--case',
  },
];

export default function InvestigationFlowAnimation() {
  return (
    <section id="typology-simulator" className="relative z-20 px-4 py-14 sm:px-8 lg:px-14 lg:py-16 bg-fintech-bg">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-fintech-border bg-fintech-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-fintech-border px-6 py-6 sm:px-8">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-fintech-primary">
              <span className="flow-live-dot" aria-hidden="true" />
              FINTRACE REVIEW WORKFLOW
            </div>
            <h2 className="text-xl font-bold text-fintech-text sm:text-2xl">From transaction data to analyst review</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-fintech-muted sm:text-sm">
              Follow how connected activity can become a model signal and then a case for human review.
            </p>
          </div>
          <span className="rounded-full border border-fintech-border bg-fintech-surface px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-fintech-muted">
            ILLUSTRATIVE · SYNTHETIC DATA
          </span>
        </div>

        <div className="relative overflow-hidden bg-fintech-surface px-4 py-5 sm:px-8">
          <svg className="flow-network" viewBox="0 0 940 240" role="img" aria-label="Animated synthetic transaction network moving through anomaly screening toward analyst review">
            <defs>
              <radialGradient id="flow-halo">
                <stop offset="0" stopColor="currentColor" stopOpacity=".2" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
            </defs>
            {motionPaths.map((path, index) => (
              <g key={path}>
                <path d={path} className="flow-network__track" />
                <circle r={index === 1 ? 4 : 3} className={`flow-network__packet flow-network__packet--${index + 1}`}>
                  <animateMotion dur={`${4.4 + index * 0.8}s`} repeatCount="indefinite" path={path} />
                </circle>
              </g>
            ))}

            <circle cx="88" cy="82" r="11" className="flow-network__node" />
            <circle cx="88" cy="158" r="11" className="flow-network__node" />
            <circle cx="170" cy="48" r="9" className="flow-network__node" />
            <circle cx="170" cy="192" r="9" className="flow-network__node" />
            <circle cx="850" cy="82" r="11" className="flow-network__node" />
            <circle cx="850" cy="158" r="11" className="flow-network__node" />
            <circle cx="850" cy="48" r="9" className="flow-network__node" />
            <circle cx="850" cy="192" r="9" className="flow-network__node" />

            <circle cx="469" cy="120" r="71" className="flow-network__halo" />
            <circle cx="469" cy="120" r="43" className="flow-network__focus-ring" />
            <circle cx="469" cy="120" r="27" className="flow-network__focus" />
            <path d="M469 103v20m0 9v.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="flow-network__mark" />

            <text x="88" y="226" textAnchor="middle" className="flow-network__label">TRANSACTIONS</text>
            <text x="469" y="190" textAnchor="middle" className="flow-network__label flow-network__label--focus">MODEL REVIEW</text>
            <text x="850" y="226" textAnchor="middle" className="flow-network__label">CASE FOLLOW-UP</text>
          </svg>
        </div>

        <div className="grid divide-y divide-fintech-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stages.map(({ number, title, detail, Icon, tone }) => (
            <div className={`flow-stage ${tone}`} key={number}>
              <div className="flow-stage__icon"><Icon size={17} strokeWidth={1.8} /></div>
              <div>
                <span className="font-mono text-[10px] text-fintech-muted">STEP {number}</span>
                <h3 className="mt-0.5 text-sm font-bold text-fintech-text">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-fintech-muted">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
