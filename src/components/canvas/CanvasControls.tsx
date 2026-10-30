import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Grid,
  Map,
} from 'lucide-react';

interface CanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetZoom: () => void;
  isMinimapVisible: boolean;
  onToggleMinimap: () => void;
  zoomLevel?: number;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetZoom,
  isMinimapVisible,
  onToggleMinimap,
  zoomLevel = 1,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-20 flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-neutral-200 shadow-md text-neutral-600 select-none">
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
  );
};
