'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PALETTES, paletteColors } from '@/lib/palettes';
import { usePalette } from '@/context/PaletteContext';
import styles from './PalettePicker.module.css';

export default function PalettePicker() {
  const { palette, setPalette } = usePalette();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={styles.container}>
      <button
        className={styles.iconBtn}
        onClick={() => setOpen(o => !o)}
        title="Change colour palette"
        aria-label="Colour palette picker"
      >
        {/* Simple palette SVG icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="8.5"  cy="7.5"  r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="6.5"  cy="12.5" r="1.5" fill="currentColor" stroke="none"/>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2v-.5c0-.55.45-1 1-1h1c2.76 0 5-2.24 5-5 0-5.52-4.03-10-9-10z"/>
        </svg>
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Colour palette</div>
          {PALETTES.map(p => {
            const colors = paletteColors(p);
            const isActive = p.id === palette.id;
            return (
              <div
                key={p.id}
                className={`${styles.paletteRow} ${isActive ? styles.paletteRowActive : ''}`}
                onClick={() => { setPalette(p); setOpen(false); }}
              >
                <span className={styles.paletteName}>{p.name}</span>
                <div className={styles.swatches}>
                  {colors.map((c, i) => (
                    <div key={i} className={styles.swatch} style={{ background: c }} />
                  ))}
                </div>
                {isActive && <span className={styles.checkmark}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
