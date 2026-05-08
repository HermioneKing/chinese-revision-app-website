'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Palette, PALETTES, DEFAULT_PALETTE } from '@/lib/palettes';

const STORAGE_KEY = 'dse-palette';

interface PaletteContextValue {
  palette: Palette;
  setPalette: (p: Palette) => void;
}

const PaletteContext = createContext<PaletteContextValue>({
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
});

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>(DEFAULT_PALETTE);

  // Apply palette to CSS custom properties
  const applyPalette = (p: Palette) => {
    const root = document.documentElement;
    root.style.setProperty('--p1', p.p1);
    root.style.setProperty('--p2', p.p2);
    root.style.setProperty('--p3', p.p3);
    root.style.setProperty('--p4', p.p4);
    root.style.setProperty('--p5', p.p5);
    root.style.setProperty('--p6', p.p6);
  };

  // Load saved palette on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const found = PALETTES.find(p => p.id === saved);
    const initial = found ?? DEFAULT_PALETTE;
    setPaletteState(initial);
    applyPalette(initial);
  }, []);

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    applyPalette(p);
    localStorage.setItem(STORAGE_KEY, p.id);
  };

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette(): PaletteContextValue {
  return useContext(PaletteContext);
}
