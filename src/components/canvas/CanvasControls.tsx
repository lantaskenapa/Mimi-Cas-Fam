import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Map,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface CanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetZoom: () => void;
  isMinimapVisible: boolean;
  onToggleMinimap: () => void;
  zoomLevel?: number;
  isHighlightEnabled: boolean;
  onToggleHighlight: () => void;
  highlightDirection?: 'ancestors' | 'descendants';
  onChangeHighlightDirection?: (dir: 'ancestors' | 'descendants') => void;
  selectedMemberName?: string;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetZoom,
  isMinimapVisible,
  onToggleMinimap,
  zoomLevel = 1,
  isHighlightEnabled,
  onToggleHighlight,
  highlightDirection = 'ancestors',
  onChangeHighlightDirection,
  selectedMemberName,
}) => {
  return (
    <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-20 flex flex-col items-end gap-2 select-none scale-90 sm:scale-100 origin-bottom-right">
      {/* Upper Area: Relationship Highlight Toggle ON/OFF */}
      <div className="flex flex-col gap-1.5 p-2 bg-white/95 backdrop-blur-md rounded-xl border border-neutral-200 shadow-md text-neutral-700 min-w-[195px] max-w-[230px]">
        {/* Toggle Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
            <Sparkles
              className={`w-3.5 h-3.5 transition-colors ${
                isHighlightEnabled
                  ? 'text-amber-500 fill-amber-400'
                  : 'text-neutral-400'
              }`}
            />
            <span>Highlight Garis</span>
          </div>

          {/* Switch Toggle */}
          <button
            onClick={onToggleHighlight}
            type="button"
            role="switch"
            aria-checked={isHighlightEnabled}
            title={
              isHighlightEnabled
                ? 'Matikan Highlight Garis'
                : 'Nyalakan Highlight Garis'
            }
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isHighlightEnabled ? 'bg-neutral-900' : 'bg-neutral-200 hover:bg-neutral-300'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                isHighlightEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Direction Controls when highlight is active and a member is selected */}
        {isHighlightEnabled && selectedMemberName && onChangeHighlightDirection && (
          <div className="pt-1.5 border-t border-neutral-100 flex flex-col gap-1 animate-in fade-in duration-150">
            <div className="text-[10px] text-neutral-400 font-medium px-0.5 truncate">
              Jalur: <span className="text-neutral-800 font-semibold">{selectedMemberName}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => onChangeHighlightDirection('ancestors')}
                className={`py-1 px-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
                  highlightDirection === 'ancestors'
                    ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Tampilkan silsilah ke atas (Orang Tua)"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Orang Tua</span>
              </button>
              <button
                onClick={() => onChangeHighlightDirection('descendants')}
                className={`py-1 px-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
                  highlightDirection === 'descendants'
                    ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Tampilkan garis keturunan ke bawah"
              >
                <ArrowDown className="w-3 h-3" />
                <span>Keturunan</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lower Area: Zoom In/Out & Canvas Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-neutral-200 shadow-md text-neutral-600">
        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          title="Perkecil Tampilan (-)"
          className="p-2 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom Level Indicator & Reset */}
        <button
          onClick={onResetZoom}
          title="Reset ke Ukuran 100%"
          className="px-2 py-1 text-xs font-mono tabular-nums font-medium text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
        >
          {Math.round(zoomLevel * 100)}%
        </button>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          title="Perbesar Tampilan (+)"
          className="p-2 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-neutral-200 mx-0.5" />

        {/* Fit to View */}
        <button
          onClick={onFitView}
          title="Muat Seluruh Pohon ke Layar (Fit to Screen)"
          className="p-2 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Toggle Minimap */}
        <button
          onClick={onToggleMinimap}
          title={isMinimapVisible ? 'Sembunyikan Peta Mini' : 'Tampilkan Peta Mini'}
          className={`p-2 rounded-lg transition-colors ${
            isMinimapVisible
              ? 'bg-neutral-100 text-neutral-900'
              : 'hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <Map className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
