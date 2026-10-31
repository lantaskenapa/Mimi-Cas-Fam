import React, { memo } from 'react';

/**
 * Workspace background watermark credits and tagline.
 * Rendered at the bottom area of the ReactFlow viewport so it smoothly pans,
 * zooms, and drags along with the workspace canvas.
 *
 * Format:
 * [CREDIT] | [TAGLINE]
 * - Credit: All caps, Montserrat Extra Bold, 2 lines tightly spaced
 * - Divider: '|'
 * - Tagline: 2 lines, Montserrat Regular, widely spaced letters
 */
export const CreditsNode = memo(() => {
  return (
    <div className="select-none pointer-events-none nodrag flex items-center">
      {/* Credit: All capital, Montserrat Extra Bold, 2 baris agak tempel */}
      <div
        className="text-[10px] sm:text-[11px] font-extrabold uppercase text-neutral-400 select-none text-right shrink-0"
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 800,
          lineHeight: 0.88,
          letterSpacing: '0.22em',
        }}
      >
        <div>RIFQI SULTHAN</div>
        <div>@ 2026</div>
      </div>

      {/* Divider bar `|` */}
      <div className="w-[1.5px] h-6 bg-neutral-300 mx-3.5 shrink-0" />

      {/* Tagline: 2 baris, Montserrat Regular, sangat renggang antar huruf */}
      <div
        className="text-[9.5px] sm:text-[10.5px] font-normal uppercase text-neutral-400/90 select-none text-left shrink-0"
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 400,
          lineHeight: 1.15,
          letterSpacing: '0.22em',
        }}
      >
        <div>MEMBANTU MENGHUBUNGKAN SETIAP GENERASI</div>
        <div>DALAM SATU POHON KELUARGA</div>
      </div>
    </div>
  );
});

CreditsNode.displayName = 'CreditsNode';
