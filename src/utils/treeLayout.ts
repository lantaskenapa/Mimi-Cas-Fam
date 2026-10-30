import { FamilyMember } from '../types/family';
import { Node, Edge, MarkerType } from '@xyflow/react';

export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 160;
export const SPOUSE_GAP = 56;
export const SIBLING_GAP = 40;
export const FAMILY_GAP = 96;
export const VERTICAL_GAP = 140;

/**
 * Calculates hierarchical generation levels for all members.
 * Guarantees that:
 * 1. Children are strictly below parents: gen(child) >= gen(parent) + 1
 * 2. Spouses share the same generation: gen(spouse1) === gen(spouse2)
 * 3. Root ancestors are at level 0
 */
export function calculateGenerations(members: FamilyMember[]): Map<string, number> {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const generations = new Map<string, number>();

  // Initialize all to 0
  members.forEach((m) => generations.set(m.id, 0));

  // Iterative relaxation up to 30 passes
  for (let pass = 0; pass < 30; pass++) {
    let changed = false;

    // Rule 1: Parent-Child hierarchy
    members.forEach((m) => {
      const currentGen = generations.get(m.id) || 0;
      let targetGen = currentGen;

      m.parentIds.forEach((pId) => {
        const parentGen = generations.get(pId) ?? 0;
        if (parentGen + 1 > targetGen) {
          targetGen = parentGen + 1;
        }
      });

      if (targetGen !== currentGen) {
        generations.set(m.id, targetGen);
        changed = true;
      }
    });

    // Rule 2: Spouses must share the same generation tier
    members.forEach((m) => {
      const currentGen = generations.get(m.id) || 0;
      m.spouseIds.forEach((sId) => {
        const spouseGen = generations.get(sId) ?? currentGen;
        const maxGen = Math.max(currentGen, spouseGen);
        if (currentGen !== maxGen) {
          generations.set(m.id, maxGen);
          changed = true;
        }
        if (spouseGen !== maxGen) {
          generations.set(sId, maxGen);
          changed = true;
        }
      });
    });

    if (!changed) break;
  }

  // Normalize so lowest number starts at 0
  let minGen = 0;
  generations.forEach((gen) => {
    if (gen < minGen) minGen = gen;
  });

  if (minGen < 0) {
    const shift = Math.abs(minGen);
    generations.forEach((gen, id) => generations.set(id, gen + shift));
  }

  return generations;
}

interface FamilyUnit {
  id: string;
  primary: FamilyMember;
  spouses: FamilyMember[];
  allMemberIds: string[];
  parentIds: string[];
  childrenIds: string[];
  unitWidth: number;
  x: number;
  y: number;
}

/**
 * Comprehensive tree layout algorithm with strict anti-overlap collision resolution.
 */
export function autoArrangeTree(members: FamilyMember[]): FamilyMember[] {
  if (members.length === 0) return [];

  const generations = calculateGenerations(members);
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, { ...m }));

  // Ensure co-parents of any child are mutually linked as spouses,
  // and single parents with spouses share the child
  members.forEach((child) => {
    if (child.parentIds && child.parentIds.length >= 2) {
      for (let i = 0; i < child.parentIds.length; i++) {
        for (let j = i + 1; j < child.parentIds.length; j++) {
          const p1 = memberMap.get(child.parentIds[i]);
          const p2 = memberMap.get(child.parentIds[j]);
          if (p1 && p2) {
            if (!p1.spouseIds.includes(p2.id)) p1.spouseIds.push(p2.id);
            if (!p2.spouseIds.includes(p1.id)) p2.spouseIds.push(p1.id);
            if (!p1.childrenIds.includes(child.id)) p1.childrenIds.push(child.id);
            if (!p2.childrenIds.includes(child.id)) p2.childrenIds.push(child.id);
          }
        }
      }
    } else if (child.parentIds && child.parentIds.length === 1) {
      const p1 = memberMap.get(child.parentIds[0]);
      if (p1 && p1.spouseIds && p1.spouseIds.length > 0) {
        const p2 = memberMap.get(p1.spouseIds[0]);
        if (p2) {
          if (!p1.childrenIds.includes(child.id)) p1.childrenIds.push(child.id);
          if (!p2.childrenIds.includes(child.id)) p2.childrenIds.push(child.id);
          if (!child.parentIds.includes(p2.id)) child.parentIds.push(p2.id);
        }
      }
    }
  });

  // Group members into generations
  const genGroups = new Map<number, string[]>();
  generations.forEach((gen, id) => {
    if (!genGroups.has(gen)) {
      genGroups.set(gen, []);
    }
    genGroups.get(gen)!.push(id);
  });

  const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);
  const unitsByGen = new Map<number, FamilyUnit[]>();
  const processedMembers = new Set<string>();

  // 1. Group into Family Units per generation
  sortedGens.forEach((gen) => {
    const memberIds = genGroups.get(gen) || [];
    const units: FamilyUnit[] = [];

    memberIds.forEach((id) => {
      if (processedMembers.has(id)) return;

      const member = memberMap.get(id)!;
      // Get all spouses not yet processed
      const spouses = member.spouseIds
        .map((sId) => memberMap.get(sId))
        .filter((s): s is FamilyMember => Boolean(s && !processedMembers.has(s.id)));

      processedMembers.add(member.id);
      spouses.forEach((s) => processedMembers.add(s.id));

      const allMemberIds = [member.id, ...spouses.map((s) => s.id)];

      // Collect all collective children
      const collectiveChildren = Array.from(
        new Set([
          ...member.childrenIds,
          ...spouses.flatMap((s) => s.childrenIds),
        ])
      );

      // Width required for this couple / unit
      const unitWidth =
        CARD_WIDTH + spouses.length * (CARD_WIDTH + SPOUSE_GAP);

      units.push({
        id: member.id,
        primary: member,
        spouses,
        allMemberIds,
        parentIds: member.parentIds,
        childrenIds: collectiveChildren,
        unitWidth,
        x: 60,
        y: 60 + gen * (CARD_HEIGHT + VERTICAL_GAP),
      });
    });

    unitsByGen.set(gen, units);
  });

  // 2. Initial Placement (Top-Down with Parent Centering)
  const unitMap = new Map<string, FamilyUnit>();
  unitsByGen.forEach((units) => {
    units.forEach((u) => {
      u.allMemberIds.forEach((mId) => unitMap.set(mId, u));
    });
  });

  sortedGens.forEach((gen) => {
    const units = unitsByGen.get(gen) || [];

    // Sort units in generation by parent horizontal midpoint to keep family branches cleanly separated
    units.sort((a, b) => {
      const aParentUnits = a.parentIds.map((pId) => unitMap.get(pId)).filter(Boolean) as FamilyUnit[];
      const bParentUnits = b.parentIds.map((pId) => unitMap.get(pId)).filter(Boolean) as FamilyUnit[];

      const aParentX = aParentUnits.length > 0
        ? aParentUnits.reduce((sum, pu) => sum + (pu.x + pu.unitWidth / 2), 0) / aParentUnits.length
        : a.x;
      const bParentX = bParentUnits.length > 0
        ? bParentUnits.reduce((sum, pu) => sum + (pu.x + pu.unitWidth / 2), 0) / bParentUnits.length
        : b.x;

      return aParentX - bParentX;
    });

    let currentX = 60;

    units.forEach((unit) => {
      // Find parent units in earlier generations
      const parentUnits = unit.parentIds
        .map((pId) => unitMap.get(pId))
        .filter(Boolean) as FamilyUnit[];

      let preferredX = currentX;

      if (parentUnits.length > 0) {
        // Average midpoint of parent unit(s)
        const avgParentMidX =
          parentUnits.reduce((sum, pu) => sum + (pu.x + pu.unitWidth / 2), 0) /
          parentUnits.length;

        // Find sibling units in this generation
        const siblingsInGen = units.filter(
          (u) =>
            u.id !== unit.id &&
            u.parentIds.some((pid) => unit.parentIds.includes(pid))
        );

        if (siblingsInGen.length === 0) {
          // Single child unit: center directly under parents
          preferredX = avgParentMidX - unit.unitWidth / 2;
        } else {
          // Multiple siblings: center the sibling group under parents
          const siblingIndex = units
            .filter((u) => u.parentIds.some((pid) => unit.parentIds.includes(pid)))
            .indexOf(unit);

          const totalSiblingWidth =
            siblingsInGen.reduce((sum, s) => sum + s.unitWidth + SIBLING_GAP, 0) +
            unit.unitWidth;

          const groupStartX = avgParentMidX - totalSiblingWidth / 2;
          // Calculate offset up to this sibling
          let offset = 0;
          const allSiblings = units.filter((u) =>
            u.parentIds.some((pid) => unit.parentIds.includes(pid))
          );
          for (let i = 0; i < siblingIndex; i++) {
            offset += allSiblings[i].unitWidth + SIBLING_GAP;
          }
          preferredX = groupStartX + offset;
        }
      }

      // Ensure no backward jump
      unit.x = Math.max(currentX, preferredX);
      currentX = unit.x + unit.unitWidth + FAMILY_GAP;
    });
  });

  // 3. Strict Anti-Overlap Collision Detection & Resolution Pass (WAJIB)
  // Ensures that within EVERY generation, each card has at least minimum gap from the previous one
  sortedGens.forEach((gen) => {
    const units = unitsByGen.get(gen) || [];
    if (units.length <= 1) return;

    // Run iterative collision resolution until no overlap exists
    for (let pass = 0; pass < 20; pass++) {
      let hadCollision = false;

      // Sort units by current X coordinate
      units.sort((a, b) => a.x - b.x);

      for (let i = 1; i < units.length; i++) {
        const prev = units[i - 1];
        const curr = units[i];

        // Determine appropriate gap:
        // SIBLING_GAP if they share parents, otherwise FAMILY_GAP
        const areSiblings =
          prev.parentIds.length > 0 &&
          curr.parentIds.some((pid) => prev.parentIds.includes(pid));
        const requiredGap = areSiblings ? SIBLING_GAP : FAMILY_GAP;

        const minAllowedX = prev.x + prev.unitWidth + requiredGap;

        if (curr.x < minAllowedX) {
          const shiftAmount = minAllowedX - curr.x;
          hadCollision = true;

          // Shift current unit and all subsequent units in this generation
          for (let j = i; j < units.length; j++) {
            units[j].x += shiftAmount;
            // Also propagate shift to any descendants in lower generations to preserve tree shape
            shiftDescendantUnits(units[j], shiftAmount, unitMap);
          }
        }
      }

      if (!hadCollision) break;
    }
  });

  // 4. Normalize canvas coordinates (Ensure minimum padding at top-left)
  let minX = Infinity;
  let minY = Infinity;

  unitsByGen.forEach((units) => {
    units.forEach((u) => {
      if (u.x < minX) minX = u.x;
      if (u.y < minY) minY = u.y;
    });
  });

  const targetPadding = 80;
  const shiftX = minX < targetPadding ? targetPadding - minX : targetPadding - minX;
  const shiftY = minY < targetPadding ? targetPadding - minY : targetPadding - minY;

  // 5. Build final FamilyMember positions
  const finalMembers: FamilyMember[] = [];

  unitsByGen.forEach((units) => {
    units.forEach((unit) => {
      const finalUnitX = unit.x + shiftX;
      const finalUnitY = unit.y + shiftY;

      // Position primary member
      const primary = unit.primary;
      primary.position = { x: Math.round(finalUnitX), y: Math.round(finalUnitY) };
      finalMembers.push(primary);

      // Position spouses side-by-side with exact SPOUSE_GAP
      let currentSpouseX = finalUnitX + CARD_WIDTH + SPOUSE_GAP;
      unit.spouses.forEach((spouse) => {
        spouse.position = {
          x: Math.round(currentSpouseX),
          y: Math.round(finalUnitY),
        };
        finalMembers.push(spouse);
        currentSpouseX += CARD_WIDTH + SPOUSE_GAP;
      });
    });
  });

  return finalMembers;
}

/**
 * Propagates horizontal position shift to all descendant units to keep branches cohesive.
 */
function shiftDescendantUnits(
  parentUnit: FamilyUnit,
  shiftAmount: number,
  unitMap: Map<string, FamilyUnit>,
  visited = new Set<string>()
) {
  if (visited.has(parentUnit.id)) return;
  visited.add(parentUnit.id);

  parentUnit.childrenIds.forEach((childId) => {
    const childUnit = unitMap.get(childId);
    if (childUnit && !visited.has(childUnit.id)) {
      childUnit.x += shiftAmount;
      shiftDescendantUnits(childUnit, shiftAmount, unitMap, visited);
    }
  });
}

export type HighlightDirection = 'ancestors' | 'descendants';

/**
 * Traverses lineage strictly in a single direction (ancestors upward OR descendants downward).
 * Does not include siblings or unrelated family branches.
 * Spouses are included as connectors.
 */
export function computeLineageHighlight(
  members: FamilyMember[],
  selectedMemberId: string | null,
  direction: HighlightDirection = 'ancestors'
): {
  highlightedMemberIds: Set<string>;
  highlightedEdgeIds: Set<string>;
} {
  const highlightedMemberIds = new Set<string>();
  const highlightedEdgeIds = new Set<string>();

  if (!selectedMemberId) {
    return { highlightedMemberIds, highlightedEdgeIds };
  }

  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const target = memberMap.get(selectedMemberId);
  if (!target) {
    return { highlightedMemberIds, highlightedEdgeIds };
  }

  highlightedMemberIds.add(target.id);

  if (direction === 'ancestors') {
    // Traverse UPWARDS only: parents, grandparents, great-grandparents...
    const queue: string[] = [target.id];
    const visited = new Set<string>([target.id]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = memberMap.get(currentId);
      if (!current) continue;

      const parentIds = current.parentIds || [];
      if (parentIds.length === 0) continue;

      let validParents = parentIds
        .map((pId) => memberMap.get(pId))
        .filter((p): p is FamilyMember => Boolean(p));

      // If single parent has spouse, associate with the couple union
      if (validParents.length === 1 && validParents[0].spouseIds && validParents[0].spouseIds.length > 0) {
        const spouse = memberMap.get(validParents[0].spouseIds[0]);
        if (spouse) {
          validParents = [validParents[0], spouse];
        }
      }

      let unionKey = '';
      if (validParents.length >= 2) {
        const p1 = validParents[0];
        const p2 = validParents[1];
        unionKey = [p1.id, p2.id].sort().join('--');
        highlightedMemberIds.add(p1.id);
        highlightedMemberIds.add(p2.id);

        // Highlight spouse connection between parents
        const pairKey = [p1.id, p2.id].sort().join('--');
        highlightedEdgeIds.add(`spouse-${pairKey}`);

        if (!visited.has(p1.id)) {
          visited.add(p1.id);
          queue.push(p1.id);
        }
        if (!visited.has(p2.id)) {
          visited.add(p2.id);
          queue.push(p2.id);
        }
      } else if (validParents.length === 1) {
        const p1 = validParents[0];
        unionKey = `single--${p1.id}`;
        highlightedMemberIds.add(p1.id);

        if (!visited.has(p1.id)) {
          visited.add(p1.id);
          queue.push(p1.id);
        }
      }

      if (unionKey) {
        highlightedEdgeIds.add(`branch-${unionKey}-child-${current.id}`);
      }
    }
  } else {
    // Traverse DOWNWARDS only: children, grandchildren, great-grandchildren...
    const queue: string[] = [target.id];
    const visited = new Set<string>([target.id]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = memberMap.get(currentId);
      if (!current) continue;

      const childrenIds = current.childrenIds || [];
      for (const childId of childrenIds) {
        const child = memberMap.get(childId);
        if (!child) continue;

        highlightedMemberIds.add(child.id);

        let validParents = (child.parentIds || [])
          .map((pId) => memberMap.get(pId))
          .filter((p): p is FamilyMember => Boolean(p));

        if (validParents.length === 1 && validParents[0].spouseIds && validParents[0].spouseIds.length > 0) {
          const spouse = memberMap.get(validParents[0].spouseIds[0]);
          if (spouse) {
            validParents = [validParents[0], spouse];
          }
        }

        let unionKey = '';
        if (validParents.length >= 2) {
          const p1 = validParents[0];
          const p2 = validParents[1];
          unionKey = [p1.id, p2.id].sort().join('--');

          // Highlight co-parent and spouse connection if married
          const otherParent = validParents.find((p) => p.id !== current.id);
          if (otherParent) {
            highlightedMemberIds.add(otherParent.id);
            const pairKey = [p1.id, p2.id].sort().join('--');
            highlightedEdgeIds.add(`spouse-${pairKey}`);
          }
        } else if (validParents.length === 1) {
          unionKey = `single--${validParents[0].id}`;
        }

        if (unionKey) {
          highlightedEdgeIds.add(`branch-${unionKey}-child-${child.id}`);
        }

        if (!visited.has(child.id)) {
          visited.add(child.id);
          queue.push(child.id);
        }
      }
    }
  }

  return { highlightedMemberIds, highlightedEdgeIds };
}

/**
 * Creates React Flow nodes and edges from FamilyMember list
 */
export function buildFlowElements(
  members: FamilyMember[],
  selectedMemberId: string | null,
  callbacks: {
    onSelect: (m: FamilyMember) => void;
    onOpenDetail: (m: FamilyMember) => void;
    onAddSpouse: (m: FamilyMember) => void;
    onAddChild: (m: FamilyMember) => void;
    onAddParent: (m: FamilyMember) => void;
    onAddSibling: (m: FamilyMember) => void;
    onEdit: (m: FamilyMember) => void;
    onDelete: (m: FamilyMember) => void;
  },
  isDragging = false,
  highlightDirection: HighlightDirection = 'ancestors',
  isHighlightEnabled = true
) {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const { highlightedMemberIds, highlightedEdgeIds } = isHighlightEnabled
    ? computeLineageHighlight(members, selectedMemberId, highlightDirection)
    : {
        highlightedMemberIds: new Set<string>(),
        highlightedEdgeIds: new Set<string>(),
      };

  const hasActiveSelection = isHighlightEnabled && Boolean(selectedMemberId);

  const nodes: Node[] = members.map((member) => {
    const isSelected = member.id === selectedMemberId;
    const isHighlighted = highlightedMemberIds.has(member.id);
    const isDimmed = hasActiveSelection && !isHighlighted;

    return {
      id: member.id,
      type: 'familyNode',
      position: member.position,
      zIndex: isSelected ? 1000 : isHighlighted ? 500 : 1,
      data: {
        member,
        isSelected,
        isHighlighted,
        isDimmed,
        ...callbacks,
      },
    };
  });

  const edges: Edge[] = [];
  const processedSpousePairs = new Set<string>();

  // 1. Spouse Edges (one edge per unique spouse pair)
  members.forEach((member) => {
    member.spouseIds.forEach((spouseId) => {
      const spouse = memberMap.get(spouseId);
      if (!spouse) return;

      const pairKey = [member.id, spouseId].sort().join('--');
      if (processedSpousePairs.has(pairKey)) return;
      processedSpousePairs.add(pairKey);

      const edgeId = `spouse-${pairKey}`;
      const isHighlighted = highlightedEdgeIds.has(edgeId);
      const isDimmed = hasActiveSelection && !isHighlighted;

      const isSourceLeft = member.position.x <= spouse.position.x;
      edges.push({
        id: edgeId,
        source: isSourceLeft ? member.id : spouseId,
        target: isSourceLeft ? spouseId : member.id,
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'spouseEdge',
        animated: false,
        zIndex: isHighlighted ? 100 : 1,
        data: {
          isDragging,
          isHighlighted,
          isDimmed,
        },
        style: {
          stroke: isHighlighted ? '#0f172a' : isDimmed ? '#cbd5e1' : '#a3a3a3',
          strokeWidth: isHighlighted ? 2.5 : isDimmed ? 1.2 : 1.25,
          opacity: isDimmed ? 0.22 : 1,
        },
      });
    });
  });

  // 2. Parent-to-Children Branch Edges Originating from Spouse Midpoint
  // Group all children by their parent couple / single parent
  const unionChildrenMap = new Map<
    string,
    { parent1: FamilyMember; parent2?: FamilyMember; children: FamilyMember[] }
  >();

  members.forEach((child) => {
    if (!child.parentIds || child.parentIds.length === 0) return;

    let validParents = child.parentIds
      .map((pId) => memberMap.get(pId))
      .filter((p): p is FamilyMember => Boolean(p));

    if (validParents.length === 0) return;

    // If child is linked to only 1 parent, but that parent has a spouse,
    // associate the child with that married couple union so the branch line begins at the LOVE icon in the center!
    if (validParents.length === 1 && validParents[0].spouseIds && validParents[0].spouseIds.length > 0) {
      const spouse = memberMap.get(validParents[0].spouseIds[0]);
      if (spouse) {
        validParents = [validParents[0], spouse];
      }
    }

    if (validParents.length >= 2) {
      // Married couple: determine unique pair key
      const p1 = validParents[0];
      const p2 = validParents[1];
      const pairKey = [p1.id, p2.id].sort().join('--');

      // Guarantee spouse edge (with love icon) exists between the parents
      if (!processedSpousePairs.has(pairKey)) {
        processedSpousePairs.add(pairKey);
        const edgeId = `spouse-${pairKey}`;
        const isHighlighted = highlightedEdgeIds.has(edgeId);
        const isDimmed = hasActiveSelection && !isHighlighted;
        const isSourceLeft = p1.position.x <= p2.position.x;
        edges.push({
          id: edgeId,
          source: isSourceLeft ? p1.id : p2.id,
          target: isSourceLeft ? p2.id : p1.id,
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'spouseEdge',
          animated: false,
          zIndex: isHighlighted ? 100 : 1,
          data: {
            isDragging,
            isHighlighted,
            isDimmed,
          },
          style: {
            stroke: isHighlighted ? '#0f172a' : isDimmed ? '#cbd5e1' : '#a3a3a3',
            strokeWidth: isHighlighted ? 2.5 : isDimmed ? 1.2 : 1.25,
            opacity: isDimmed ? 0.22 : 1,
          },
        });
      }

      const unionKey = pairKey;
      if (!unionChildrenMap.has(unionKey)) {
        unionChildrenMap.set(unionKey, { parent1: p1, parent2: p2, children: [] });
      }
      unionChildrenMap.get(unionKey)!.children.push(child);
    } else {
      // Single parent without spouse
      const p1 = validParents[0];
      const unionKey = `single--${p1.id}`;
      if (!unionChildrenMap.has(unionKey)) {
        unionChildrenMap.set(unionKey, { parent1: p1, children: [] });
      }
      unionChildrenMap.get(unionKey)!.children.push(child);
    }
  });

  // 3. Multi-track collision-free branch routing for all family unions
  interface FamilyUnion {
    unionKey: string;
    parent1: FamilyMember;
    parent2?: FamilyMember;
    children: FamilyMember[];
    midX: number;
    midY: number;
    maxParentBottom: number;
    minChildTop: number;
    minX: number;
    maxX: number;
    busY: number;
  }

  const unionList: FamilyUnion[] = [];

  unionChildrenMap.forEach(({ parent1, parent2, children }, unionKey) => {
    let midX: number;
    let midY: number;

    if (parent2) {
      const leftP = parent1.position.x <= parent2.position.x ? parent1 : parent2;
      const rightP = parent1.position.x <= parent2.position.x ? parent2 : parent1;
      midX = (leftP.position.x + CARD_WIDTH + rightP.position.x) / 2;
      midY = (leftP.position.y + rightP.position.y) / 2 + CARD_HEIGHT / 2;
    } else {
      midX = parent1.position.x + CARD_WIDTH / 2;
      midY = parent1.position.y + CARD_HEIGHT;
    }

    const maxParentBottom = Math.max(
      parent1.position.y + CARD_HEIGHT,
      parent2 ? parent2.position.y + CARD_HEIGHT : 0
    );
    const minChildTop = Math.min(...children.map((c) => c.position.y));

    // Horizontal bounds of this family's child bus
    const childCentersX = children.map((c) => c.position.x + CARD_WIDTH / 2);
    const minX = Math.min(midX, ...childCentersX);
    const maxX = Math.max(midX, ...childCentersX);

    unionList.push({
      unionKey,
      parent1,
      parent2,
      children,
      midX,
      midY,
      maxParentBottom,
      minChildTop,
      minX,
      maxX,
      busY: 0,
    });
  });

  // Sort unions by generation tier (maxParentBottom) and then left-to-right (midX)
  unionList.sort((a, b) => {
    if (Math.abs(a.maxParentBottom - b.maxParentBottom) > 50) {
      return a.maxParentBottom - b.maxParentBottom;
    }
    return a.midX - b.midX;
  });

  // Assign distinct, non-overlapping bus Y altitudes for each family branch
  const allocatedBusBands: Array<{ minX: number; maxX: number; busY: number; tierY: number }> = [];

  unionList.forEach((union) => {
    const gap = union.minChildTop - union.maxParentBottom;
    const baseBusY =
      gap > 50
        ? Math.round(union.maxParentBottom + gap * 0.45)
        : union.maxParentBottom + 35;

    // Track slots with 18px separation: 0, +18, -18, +36, -36
    const trackOffsets = [0, 18, -18, 36, -36, 54, -54];
    let chosenBusY = baseBusY;

    for (const offset of trackOffsets) {
      const candidateBusY = baseBusY + offset;

      // Safe margin >= 22px from parent bottom and child top
      if (
        candidateBusY < union.maxParentBottom + 22 ||
        candidateBusY > union.minChildTop - 22
      ) {
        continue;
      }

      // Check for collision with any other family's bus in this generation tier
      const hasCollision = allocatedBusBands.some((allocated) => {
        // Are they in the same generation vertical tier?
        const sameTier = Math.abs(allocated.tierY - union.maxParentBottom) < 60;
        if (!sameTier) return false;

        // Is the bus altitude too close (< 14px)?
        const altitudeTooClose = Math.abs(allocated.busY - candidateBusY) < 14;
        if (!altitudeTooClose) return false;

        // Do their horizontal spans overlap or come within 32px of each other?
        const horizontalOverlap = !(
          union.maxX + 32 < allocated.minX || union.minX - 32 > allocated.maxX
        );

        return horizontalOverlap;
      });

      if (!hasCollision) {
        chosenBusY = candidateBusY;
        break;
      }
    }

    union.busY = chosenBusY;
    allocatedBusBands.push({
      minX: union.minX,
      maxX: union.maxX,
      busY: chosenBusY,
      tierY: union.maxParentBottom,
    });
  });

  const obstacles = members.map((m) => ({
    id: m.id,
    x: m.position.x,
    y: m.position.y,
  }));

  // Create exactly ONE genealogical branching edge per child
  unionList.forEach((union) => {
    const { parent1, parent2, children, unionKey, midX, midY, busY } = union;

    children.forEach((child, index) => {
      const edgeId = `branch-${unionKey}-child-${child.id}`;
      const isHighlighted = highlightedEdgeIds.has(edgeId);
      const isDimmed = hasActiveSelection && !isHighlighted;

      edges.push({
        id: edgeId,
        source: parent1.id,
        target: child.id,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'parentChildBranchEdge',
        zIndex: isHighlighted ? 100 : 1,
        data: {
          parent1Id: parent1.id,
          parent2Id: parent2?.id,
          midX,
          midY,
          busY,
          childCenterX: child.position.x + CARD_WIDTH / 2,
          childTopY: child.position.y,
          siblingIndex: index,
          siblingCount: children.length,
          obstacles,
          isDragging,
          isHighlighted,
          isDimmed,
        },
        style: {
          stroke: isHighlighted ? '#0f172a' : isDimmed ? '#cbd5e1' : '#94a3b8',
          strokeWidth: isHighlighted ? 2.75 : isDimmed ? 1.2 : 1.5,
          opacity: isDimmed ? 0.22 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: isHighlighted ? 8 : 7,
          height: isHighlighted ? 8 : 7,
          color: isHighlighted ? '#0f172a' : isDimmed ? '#cbd5e1' : '#94a3b8',
        },
      });
    });
  });

  return { nodes, edges };
}

/**
 * Gets all direct relatives for the side details panel.
 */
export function getRelatedMembers(members: FamilyMember[], currentId: string) {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const current = memberMap.get(currentId);
  if (!current) {
    return {
      spouses: [],
      parents: [],
      children: [],
      siblings: [],
    };
  }

  const spouses = current.spouseIds
    .map((id) => memberMap.get(id))
    .filter(Boolean) as FamilyMember[];

  const parents = current.parentIds
    .map((id) => memberMap.get(id))
    .filter(Boolean) as FamilyMember[];

  const children = current.childrenIds
    .map((id) => memberMap.get(id))
    .filter(Boolean) as FamilyMember[];

  const siblings = members.filter(
    (m) =>
      m.id !== current.id &&
      m.parentIds.length > 0 &&
      current.parentIds.some((pId) => m.parentIds.includes(pId))
  );

  return {
    spouses,
    parents,
    children,
    siblings,
  };
}
