import React from 'react';
import { BaseEdge, EdgeProps, useInternalNode } from '@xyflow/react';

export interface ParentChildBranchData {
  parent1Id?: string;
  parent2Id?: string;
  midX?: number;
  midY?: number;
  childCenterX?: number;
  childTopY?: number;
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

  // Calculate start position dynamically from parents' positions
  let startX = sourceX;
  let startY = sourceY;

  if (branchData.parent2Id && parent2Node && parent1Node) {
    const p1X = parent1Node.internals?.positionAbsolute?.x ?? parent1Node.position?.x ?? (sourceX - 115);
    const p1Y = parent1Node.internals?.positionAbsolute?.y ?? parent1Node.position?.y ?? (sourceY - 75);
    const p1W = parent1Node.measured?.width ?? 230;
    const p1H = parent1Node.measured?.height ?? 75;

    const p2X = parent2Node.internals?.positionAbsolute?.x ?? parent2Node.position?.x ?? 0;
    const p2Y = parent2Node.internals?.positionAbsolute?.y ?? parent2Node.position?.y ?? 0;
    const p2W = parent2Node.measured?.width ?? 230;
    const p2H = parent2Node.measured?.height ?? 75;

    const p1CenterX = p1X + p1W / 2;
    const p1CenterY = p1Y + p1H / 2;
    const p2CenterX = p2X + p2W / 2;
    const p2CenterY = p2Y + p2H / 2;

    startX = (p1CenterX + p2CenterX) / 2;
    // Originates right under the love icon badge (+14px from midpoint Y)
    startY = (p1CenterY + p2CenterY) / 2 + 14;
  } else if (branchData.midX !== undefined && branchData.midY !== undefined && !parent1Node) {
    // Safe fallback if nodes are not yet measured
    startX = branchData.midX;
    startY = branchData.midY + 14;
  }

  const endX = targetX;
  const endY = targetY;

  const deltaX = endX - startX;
  const deltaY = endY - startY;

  // Flexible and organic curve ("lentur jangan kaku")
  let path = '';

  if (deltaY > 15) {
    // Child is below parents in generational hierarchy
    // Vertical stem dropping from below the love icon, then smooth organic bezier curve to child
    const stemLength = Math.min(22, Math.max(10, deltaY * 0.22));
    const stemY = startY + stemLength;
    const curveSpan = (endY - stemY) * 0.5;

    path = `M ${startX} ${startY} L ${startX} ${stemY} C ${startX} ${stemY + curveSpan}, ${endX} ${endY - curveSpan}, ${endX} ${endY}`;
  } else {
    // If card is dragged level or above parents, curve smoothly without breaking
    const curvature = Math.max(40, Math.abs(deltaX) * 0.35);
    path = `M ${startX} ${startY} C ${startX} ${startY + curvature}, ${endX} ${endY - curvature}, ${endX} ${endY}`;
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: '#a3a3a3',
        strokeWidth: 1.25,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        ...style,
      }}
      markerEnd={markerEnd}
    />
  );
};
