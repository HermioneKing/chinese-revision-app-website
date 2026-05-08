// ============================================================
// PALETTE PRESETS
// Add / edit palettes here. The first entry is the default.
// Each palette needs exactly 6 colours: p1–p6.
// ============================================================

export interface Palette {
  id:   string;
  name: string;
  p1: string; // primary accent
  p2: string; // positive / green-ish
  p3: string; // warning / amber
  p4: string; // negative / red
  p5: string; // chart series 5
  p6: string; // chart series 6
}

export const PALETTES: Palette[] = [
  {
    id: 'ocean', name: 'Ocean',
    p1: '#4A90A4', p2: '#7CB87A', p3: '#E8A838',
    p4: '#D96B6B', p5: '#9B7EC8', p6: '#6B9EC8',
  },
  {
    id: 'indigo', name: 'Indigo',
    p1: '#5C6BC0', p2: '#66BB6A', p3: '#FFA726',
    p4: '#EF5350', p5: '#AB47BC', p6: '#26C6DA',
  },
  {
    id: 'forest', name: 'Forest',
    p1: '#388E3C', p2: '#8BC34A', p3: '#FBC02D',
    p4: '#E53935', p5: '#6D4C41', p6: '#00897B',
  },
  {
    id: 'rose', name: 'Rose',
    p1: '#C2185B', p2: '#43A047', p3: '#FB8C00',
    p4: '#D32F2F', p5: '#7B1FA2', p6: '#1976D2',
  },
  {
    id: 'slate', name: 'Slate',
    p1: '#455A64', p2: '#4CAF50', p3: '#FF9800',
    p4: '#F44336', p5: '#7E57C2', p6: '#29B6F6',
  },
];

export const DEFAULT_PALETTE = PALETTES[0];

/** Returns an ordered array of the 6 hex values for Chart.js */
export function paletteColors(p: Palette): string[] {
  return [p.p1, p.p2, p.p3, p.p4, p.p5, p.p6];
}

/** Same but at 80% opacity (append CC to hex) */
export function paletteColorsAlpha(p: Palette): string[] {
  return paletteColors(p).map(c => c + 'CC');
}
