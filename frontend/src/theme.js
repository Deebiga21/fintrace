/**
 * Editorial dark design tokens, mirrored for JavaScript consumers.
 *
 * Tailwind classes and CSS variables cover JSX. Charting libraries
 * (Recharts) and the graph canvas (Cytoscape) need literal values, so this
 * module is the single source of truth for those. Keep it in sync with the
 * `:root` block in `index.css` — both encode the same palette as the landing
 * page, and neither flips with the legacy light/dark toggle.
 */
export const palette = {
  canvas: '#0B0B0F',
  raised: '#101117',
  ink: '#FFFFFF',
  inkMuted: '#9CA3AF',
  inkFaint: '#8A909B',
  rule: 'rgba(255, 255, 255, 0.12)',
  ruleStrong: 'rgba(255, 255, 255, 0.22)',
  accent: '#1FC8DB',
  accentDeep: '#0E9FB3',
  spec: '#FFD23F',
  gain: '#22C55E',
  loss: '#FF5C6C',
  primaryInk: '#0B0B0F',
};

/** Shared Recharts styling: thin cyan stroke, hairline grid, mono ticks. */
export const chartTheme = {
  grid: 'rgba(255, 255, 255, 0.08)',
  axisLine: 'rgba(255, 255, 255, 0.12)',
  tick: {
    fill: palette.inkFaint,
    fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace",
  },
  stroke: palette.accent,
  strokeFlagged: palette.loss,
  fillFrom: 'rgba(31, 200, 219, 0.18)',
  fillTo: 'rgba(31, 200, 219, 0.00)',
  tooltip: {
    background: palette.raised,
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: 10,
    color: palette.ink,
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    boxShadow: '0 12px 32px -12px rgba(0, 0, 0, 0.8)',
  },
  /** Recharts renders a cursor line on hover; keep it a hairline, not a block. */
  cursor: { stroke: 'rgba(255, 255, 255, 0.18)', strokeWidth: 1 },
};

/** Shared Cytoscape styling so the graph matches the rest of the product. */
export const graphTheme = {
  node: {
    high: palette.loss,
    medium: palette.spec,
    low: palette.inkFaint,
    label: palette.ink,
    border: 'rgba(255, 255, 255, 0.25)',
  },
  edge: {
    line: 'rgba(255, 255, 255, 0.22)',
    flagged: palette.loss,
    label: palette.inkFaint,
  },
  canvas: palette.canvas,
};

/** Contrast ratios against the canvas, measured, not estimated. */
export const contrast = [
  { token: 'ink', value: palette.ink, ratio: '19.64:1' },
  { token: 'spec', value: palette.spec, ratio: '13.60:1' },
  { token: 'accent', value: palette.accent, ratio: '9.68:1' },
  { token: 'gain', value: palette.gain, ratio: '8.62:1' },
  { token: 'inkMuted', value: palette.inkMuted, ratio: '7.74:1' },
  { token: 'loss', value: palette.loss, ratio: '6.55:1' },
  { token: 'inkFaint', value: palette.inkFaint, ratio: '6.12:1' },
];
