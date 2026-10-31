import React from 'react';
import { BaseEdge, EdgeProps, useInternalNode } from '@xyflow/react';

export interface ParentChildBranchData {
  parent1Id?: string;
  parent2Id?: string;
  midX?: number;
  midY?: number;
  busY?: number;
  childCenterX?: number;
  childTopY?: number;
  siblingIndex?: number;
  siblingCount?: number;
  obstacles?: Array<{ id: string; x: number; y: number }>;
  isDragging?: boolean;
  isDifferentiated?: boolean;
}

export const ParentChildBranchEdge: React.FC<EdgeProps> = ({
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
  const branchData = ((data || {}) as unknown) as ParentChildBranchData;
  const parent1Node = useInternalNode(source);
  const parent2Node = useInternalNode(branchData.parent2Id || '');
  const childNode = useInternalNode(target);

  // Dynamic drag detection: flexible when dragging, rigid/kaku when static
  const isDragging = Boolean(
    branchData.isDragging ||
      parent1Node?.dragging ||
      parent2Node?.dragging ||
      childNode?.dragging
  );

  // 1. Calculate Marriage Junction origin (startX, startY)
  let startX = sourceX;
  let startY = sourceY;

  const CARD_W = 150;
  const CARD_H = 160;

  if (branchData.parent2Id && parent2Node && parent1Node) {
    const p1X = parent1Node.internals?.positionAbsolute?.x ?? parent1Node.position?.x ?? (sourceX - CARD_W / 2);
    const p1Y = parent1Node.internals?.positionAbsolute?.y ?? parent1Node.position?.y ?? (sourceY - CARD_H);
    const p1W = parent1Node.measured?.width ?? CARD_W;
    const p1H = parent1Node.measured?.height ?? CARD_H;

    const p2X = parent2Node.internals?.positionAbsolute?.x ?? parent2Node.position?.x ?? 0;
    const p2Y = parent2Node.internals?.positionAbsolute?.y ?? parent2Node.position?.y ?? 0;
    const p2W = parent2Node.measured?.width ?? CARD_W;
    const p2H = parent2Node.measured?.height ?? CARD_H;

    const p1CenterX = p1X + p1W / 2;
    const p1CenterY = p1Y + p1H / 2;
    const p2CenterX = p2X + p2W / 2;
    const p2CenterY = p2Y + p2H / 2;

    // Originates at the Marriage Junction (center of couple, right below love badge)
    startX = (p1CenterX + p2CenterX) / 2;
    startY = (p1CenterY + p2CenterY) / 2 + 15;
  } else if (parent1Node) {
    // Single parent: originates from bottom handle
    const p1X = parent1Node.internals?.positionAbsolute?.x ?? parent1Node.position?.x ?? (sourceX - CARD_W / 2);
    const p1Y = parent1Node.internals?.positionAbsolute?.y ?? parent1Node.position?.y ?? (sourceY - CARD_H);
    const p1W = parent1Node.measured?.width ?? CARD_W;
    const p1H = parent1Node.measured?.height ?? CARD_H;
    startX = p1X + p1W / 2;
    startY = p1Y + p1H;
  } else if (branchData.midX !== undefined && branchData.midY !== undefined) {
    startX = branchData.midX;
    startY = branchData.midY + 15;
  }

  // 2. Child target coordinates
  const endX = targetX;
  const endY = targetY;

  const deltaX = endX - startX;
  const deltaY = endY - startY;

  // 3. Shared Horizontal Bus Level (busY)
  let busY: number =
    branchData.busY ??
    (() => {
      const p1Bottom = (parent1Node?.internals?.positionAbsolute?.y ?? (sourceY - CARD_H)) + CARD_H;
      const p2Bottom = branchData.parent2Id && parent2Node
        ? (parent2Node.internals?.positionAbsolute?.y ?? (sourceY - CARD_H)) + CARD_H
        : p1Bottom;
      const maxParentBottom = Math.max(p1Bottom, p2Bottom);
      if (endY > maxParentBottom + 40) {
        return Math.round(maxParentBottom + (endY - maxParentBottom) * 0.45);
      }
      return Math.round(startY + 35);
    })();

  const obstacles = branchData.obstacles || [];
  const SAFE_MARGIN = 24; // Guaranteed >= 20px safe distance from cards

  let path = '';

  if (isDragging) {
    // Lentur ketika di-drag: kurva elastis bezier halus
    if (deltaY > 15) {
      const stemLength = Math.min(26, Math.max(12, deltaY * 0.22));
      const stemY = startY + stemLength;
      const curveSpan = (endY - stemY) * 0.5;

      path = `M ${startX} ${startY} L ${startX} ${stemY} C ${startX} ${stemY + curveSpan}, ${endX} ${endY - curveSpan}, ${endX} ${endY}`;
    } else {
      const curvature = Math.max(40, Math.abs(deltaX) * 0.35);
      path = `M ${startX} ${startY} C ${startX} ${startY + curvature}, ${endX} ${endY - curvature}, ${endX} ${endY}`;
    }
  } else {
    // Kaku (100% Orthogonal 90 derajat): Trunk -> Shared Bus -> Drop
    // Check if horizontal bus segment hits an obstacle card
    const hMin = Math.min(startX, endX);
    const hMax = Math.max(startX, endX);

    const horizontalBlocker = obstacles.find((o) => {
      if (o.id === source || o.id === branchData.parent2Id || o.id === target) return false;
      const oLeft = o.x - SAFE_MARGIN;
      const oRight = o.x + CARD_W + SAFE_MARGIN;
      const oTop = o.y - SAFE_MARGIN;
      const oBottom = o.y + CARD_H + SAFE_MARGIN;
      return busY >= oTop && busY <= oBottom && !(hMax < oLeft || hMin > oRight);
    });

    if (horizontalBlocker) {
      // Shift bus corridor above or below the blocker with safe margin
      if (horizontalBlocker.y - SAFE_MARGIN > startY + 20) {
        busY = horizontalBlocker.y - SAFE_MARGIN;
      } else {
        busY = horizontalBlocker.y + CARD_H + SAFE_MARGIN;
      }
    }

    // Check if vertical trunk from (startX, startY) to (startX, busY) hits an obstacle card
    const trunkBlocker = obstacles.find((o) => {
      if (o.id === source || o.id === branchData.parent2Id || o.id === target) return false;
      const oLeft = o.x - SAFE_MARGIN;
      const oRight = o.x + CARD_W + SAFE_MARGIN;
      const oTop = o.y - SAFE_MARGIN;
      const oBottom = o.y + CARD_H + SAFE_MARGIN;
      const tMin = Math.min(startY, busY);
      const tMax = Math.max(startY, busY);
      return startX >= oLeft && startX <= oRight && !(tMax < oTop || tMin > oBottom);
    });

    // Check if vertical drop from (endX, busY) to (endX, endY) hits an obstacle card
    const vMin = Math.min(busY, endY);
    const vMax = Math.max(busY, endY);

    const verticalBlocker = obstacles.find((o) => {
      if (o.id === source || o.id === branchData.parent2Id || o.id === target) return false;
      const oLeft = o.x - SAFE_MARGIN;
      const oRight = o.x + CARD_W + SAFE_MARGIN;
      const oTop = o.y - SAFE_MARGIN;
      const oBottom = o.y + CARD_H + SAFE_MARGIN;
      return endX >= oLeft && endX <= oRight && !(vMax < oTop || vMin > oBottom);
    });

    if (trunkBlocker) {
      const detourTrunkX =
        startX < trunkBlocker.x + CARD_W / 2
          ? trunkBlocker.x - SAFE_MARGIN
          : trunkBlocker.x + CARD_W + SAFE_MARGIN;
      const detourTrunkY = trunkBlocker.y + CARD_H + SAFE_MARGIN;
      path = `M ${startX} ${startY} L ${detourTrunkX} ${startY} L ${detourTrunkX} ${detourTrunkY} L ${startX} ${detourTrunkY} L ${startX} ${busY} L ${endX} ${busY} L ${endX} ${endY}`;
    } else if (verticalBlocker) {
      // Obstacle-aware orthogonal detour around the blocking card
      const detourX =
        endX < verticalBlocker.x + CARD_W / 2
          ? verticalBlocker.x - SAFE_MARGIN
          : verticalBlocker.x + CARD_W + SAFE_MARGIN;
      const detourY = verticalBlocker.y + CARD_H + SAFE_MARGIN;

      path = `M ${startX} ${startY} L ${startX} ${busY} L ${detourX} ${busY} L ${detourX} ${detourY} L ${endX} ${detourY} L ${endX} ${endY}`;
    } else {
      // Clean, classic genealogical orthogonal path
      if (Math.abs(startX - endX) < 1) {
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else {
        path = `M ${startX} ${startY} L ${startX} ${busY} L ${endX} ${busY} L ${endX} ${endY}`;
      }
    }
  }

  // Render trunk-to-bus junction marker dot for multiple siblings
  const showJunctionDot =
    !isDragging &&
    Boolean(branchData.siblingCount && branchData.siblingCount > 1) &&
    branchData.siblingIndex === 0;

  const isHighlighted = Boolean((data as any)?.isHighlighted);
  const isDimmed = Boolean((data as any)?.isDimmed);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: isHighlighted ? '#0f172a' : isDimmed ? '#cbd5e1' : '#94a3b8',
          strokeWidth: isHighlighted ? 2.75 : isDimmed ? 1.2 : 1.5,
          strokeLinecap: 'square',
          strokeLinejoin: 'miter',
          opacity: isDimmed ? 0.22 : 1,
          pointerEvents: 'none',
          ...style,
        }}
        markerEnd={markerEnd}
      />

      {showJunctionDot && (
        <circle
          cx={startX}
          cy={busY}
          r={isHighlighted ? 3.5 : 3}
          fill={isHighlighted ? '#0f172a' : isDimmed ? '#cbd5e1' : '#64748b'}
          opacity={isDimmed ? 0.22 : 1}
          className="pointer-events-none select-none touch-none transition-all"
        />
      )}
    </>
  );
};
