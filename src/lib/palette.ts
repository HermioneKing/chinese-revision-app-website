// ============================================================
// COLOUR PALETTE — change all 6 colours here for trial & error
// These are used by Chart.js (JS) and mirrored in globals.css
// as CSS custom properties for non-chart UI elements.
// ============================================================

export const PALETTE = {
  /** Primary — teal blue; main accent, first chart series */
  p1: '#4A90A4',
  /** Green — matches sidebar tone; positive/active states */
  p2: '#7CB87A',
  /** Amber — warnings, attention cards */
  p3: '#E8A838',
  /** Coral red — errors, negative stats */
  p4: '#D96B6B',
  /** Lavender — fifth chart series */
  p5: '#9B7EC8',
  /** Steel blue — sixth chart series */
  p6: '#6B9EC8',
} as const;

/** Ordered array for Chart.js datasets (background fills at 80% opacity) */
export const CHART_COLORS = Object.values(PALETTE);

export const CHART_COLORS_ALPHA = CHART_COLORS.map((hex) => hex + 'CC');
