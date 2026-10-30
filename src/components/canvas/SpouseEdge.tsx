import React from 'react';
import { BaseEdge, EdgeProps, useInternalNode } from '@xyflow/react';
import { Heart } from 'lucide-react';

export const SpouseEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style = {},
  markerEnd,
}) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const isDragging = Boolean(
    (data as any)?.isDragging ||
      sourceNode?.dragging ||
      targetNode?.dragging
  );

  // Center between the two spouse nodes
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dist = Math.hypot(dx, dy);

  // Love badge radius with clear margin:
  const gapRadius = 17;

  let path = '';

  if (dist <= gapRadius * 2) {
    // If cards are pulled so close that they overlap the badge, don't draw overlapping line
    path = '';
  } else {
    // Angle of connection
    const angle = Math.atan2(dy, dx);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Stop cleanly before love badge
    const p1X = midX - cosA * gapRadius;
    const p1Y = midY - sinA * gapRadius;

    // Resume cleanly after love badge
    const p2X = midX + cosA * gapRadius;
    const p2Y = midY + sinA * gapRadius;

    if (isDragging) {
      // Lentur ketika di-drag: kurva bezier fleksibel
      const dX1 = p1X - sourceX;
      const dX2 = targetX - p2X;

      const cp1X1 = sourceX + dX1 * 0.45;
      const cp1Y1 = sourceY;
      const cp1X2 = p1X - dX1 * 0.2;
      const cp1Y2 = p1Y;

      const cp2X1 = p2X + dX2 * 0.2;
      const cp2Y1 = p2Y;
      const cp2X2 = targetX - dX2 * 0.45;
      const cp2Y2 = targetY;

      path = `M ${sourceX} ${sourceY} C ${cp1X1} ${cp1Y1}, ${cp1X2} ${cp1Y2}, ${p1X} ${p1Y} M ${p2X} ${p2Y} C ${cp2X1} ${cp2Y1}, ${cp2X2} ${cp2Y2}, ${targetX} ${targetY}`;
    } else {
      // Kaku (90 derajat horizontal & vertikal): hindari garis diagonal
      const badgeStopLeft = midX - 15;
      const badgeStopRight = midX + 15;

      if (Math.abs(sourceY - targetY) > 2) {
        // Orthogonal 90-degree step to marriage junction
        path = `M ${sourceX} ${sourceY} L ${badgeStopLeft} ${sourceY} L ${badgeStopLeft} ${midY} M ${badgeStopRight} ${midY} L ${badgeStopRight} ${targetY} L ${targetX} ${targetY}`;
      } else {
        // Direct clean horizontal segments
        path = `M ${sourceX} ${sourceY} L ${badgeStopLeft} ${midY} M ${badgeStopRight} ${midY} L ${targetX} ${targetY}`;
      }
    }
  }

  return (
    <>
      {path && (
        <BaseEdge
          id={id}
          path={path}
          style={{
            stroke: '#a3a3a3',
            strokeWidth: 1.25,
            strokeLinecap: 'round',
            ...style,
          }}
          markerEnd={markerEnd}
        />
      )}

      {/* Love badge floating cleanly in the gap between the two line segments */}
      <foreignObject
        width={26}
        height={26}
        x={midX - 13}
        y={midY - 13}
        className="pointer-events-none select-none overflow-visible"
      >
        <div className="w-[26px] h-[26px] rounded-full bg-white border border-rose-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center justify-center text-rose-500">
          <Heart className="w-3.5 h-3.5 fill-rose-500 stroke-rose-600" />
        </div>
      </foreignObject>
    </>
  );
};
