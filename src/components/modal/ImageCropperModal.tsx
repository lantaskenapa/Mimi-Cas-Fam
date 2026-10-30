import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Crop,
  RefreshCw,
  Maximize2,
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

const VIEWPORT_SIZE = 280; // square viewport size in px
const APERTURE_SIZE = 230; // circular crop diameter in px
const OUTPUT_SIZE = 480; // final output export resolution in px

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 1, height: 1 });

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Preload and get true natural dimensions when imageSrc changes
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      setNaturalDimensions({
        width: img.naturalWidth || 400,
        height: img.naturalHeight || 400,
      });
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  // Compute base display dimensions that preserve 100% of original aspect ratio without clipping
  const aspect = naturalDimensions.width / (naturalDimensions.height || 1);
  let baseWidth: number;
  let baseHeight: number;

  if (aspect >= 1) {
    // Landscape photo: match height to aperture, width extends naturally
    baseHeight = APERTURE_SIZE;
    baseWidth = APERTURE_SIZE * aspect;
  } else {
    // Portrait photo: match width to aperture, height extends naturally
    baseWidth = APERTURE_SIZE;
    baseHeight = APERTURE_SIZE / aspect;
  }

  // Pointer drag events (supports touch and mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => Math.min(3.5, Math.max(0.5, +(z + delta).toFixed(2))));
  };

  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleFitEntirePhoto = () => {
    // Scales photo down so its longer side fits inside aperture
    const fitZoom = aspect >= 1 ? 1 / aspect : aspect;
    setZoom(+Math.max(0.5, fitZoom).toFixed(2));
    setOffset({ x: 0, y: 0 });
  };

  // Process and export cropped high-res result
  const handleApplyCrop = useCallback(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use highest quality image interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    ctx.save();
    // 1. Center canvas origin
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

    // 2. Coordinate multiplier between preview aperture and final canvas
    const scale = OUTPUT_SIZE / APERTURE_SIZE;

    // 3. User pan offset in output coordinates (Must be before rotation & zoom to match CSS transform evaluation)
    ctx.translate(offset.x * scale, offset.y * scale);

    // 4. User rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // 5. User zoom
    ctx.scale(zoom, zoom);

    // 6. Draw uncropped full image centered
    const drawW = baseWidth * scale;
    const drawH = baseHeight * scale;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const croppedResult = canvas.toDataURL('image/jpeg', 0.95);
    onConfirm(croppedResult);
  }, [baseWidth, baseHeight, zoom, rotation, offset, onConfirm]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-800">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Sesuaikan & Potong Foto
              </h3>
              <p className="text-[11px] text-neutral-500">
                Posisikan wajah di dalam lingkaran avatar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Viewport Area */}
        <div className="p-4 sm:p-5 flex flex-col items-center bg-neutral-950/5">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            className="relative overflow-hidden rounded-2xl bg-neutral-900 shadow-inner cursor-grab active:cursor-grabbing touch-none select-none border border-neutral-200"
          >
            {/* Draggable Uncropped Image Container (centered at 50% 50%) */}
            <div
              className="absolute left-1/2 top-1/2 pointer-events-none"
              style={{
                width: `${baseWidth}px`,
                height: `${baseHeight}px`,
                marginLeft: `${-baseWidth / 2}px`,
                marginTop: `${-baseHeight / 2}px`,
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.12s ease-out',
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Original crop preview"
                className="w-full h-full object-contain pointer-events-none select-none block"
                draggable={false}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth && el.naturalHeight) {
                    setNaturalDimensions({
                      width: el.naturalWidth,
                      height: el.naturalHeight,
                    });
                  }
                }}
              />
            </div>

            {/* Circular Aperture Mask: Outside dark, inside bright circular cutout */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className="rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]"
                style={{ width: APERTURE_SIZE, height: APERTURE_SIZE }}
              />
            </div>

            {/* Subtle Rule-of-Thirds Grid inside circular aperture */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
              <div
                className="grid grid-cols-3 grid-rows-3 border border-white/40 rounded-full overflow-hidden"
                style={{ width: APERTURE_SIZE, height: APERTURE_SIZE }}
              >
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-white/30" />
                <div className="border-r border-white/30" />
                <div />
              </div>
            </div>

            {/* Bottom floating helper tip */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-white/90 pointer-events-none flex items-center gap-1 font-medium">
              <Move className="w-2.5 h-2.5" />
              <span>Geser foto untuk memposisikan</span>
            </div>
          </div>
        </div>

        {/* Adjustments Controls */}
        <div className="px-5 py-3 space-y-3 bg-white border-t border-neutral-100">
          {/* Zoom Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-medium">
              <span className="flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-neutral-400" /> Ukuran Foto
              </span>
              <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, +(z + 0.15).toFixed(2)))}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Tools Row: Rotate, Fit Full, Reset */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate90}
                className="px-2 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1"
                title="Putar foto 90 derajat"
              >
                <RotateCw className="w-3 h-3 text-neutral-500" />
                <span>Putar 90°</span>
              </button>

              <button
                type="button"
                onClick={handleFitEntirePhoto}
                className="px-2 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1"
                title="Muat seluruh gambar asli ke lingkaran"
              >
                <Maximize2 className="w-3 h-3 text-neutral-500" />
                <span>Muat Utuh</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1"
                title="Kembalikan posisi & ukuran awal"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <span className="text-[10px] text-neutral-400 font-mono">
              {naturalDimensions.width}×{naturalDimensions.height}
            </span>
          </div>
        </div>

        {/* Modal Footer / Confirmation */}
        <div className="px-5 py-3.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Terapkan & Simpan Foto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
