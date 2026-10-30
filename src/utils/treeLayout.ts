import { FamilyMember } from '../types/family';
import { Node, Edge, MarkerType } from '@xyflow/react';

export const CARD_WIDTH = 230;
export const CARD_HEIGHT = 75;
export const SPOUSE_GAP = 56;
export const SIBLING_GAP = 40;
export const FAMILY_GAP = 70;
export const VERTICAL_GAP = 130;

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
  }
) {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const nodes: Node[] = members.map((member) => ({
    id: member.id,
    type: 'familyNode',
    position: member.position,
    zIndex: member.id === selectedMemberId ? 1000 : 1,
    data: {
      member,
      isSelected: member.id === selectedMemberId,
      ...callbacks,
    },
  }));

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

      const isSourceLeft = member.position.x <= spouse.position.x;
      edges.push({
        id: `spouse-${pairKey}`,
        source: isSourceLeft ? member.id : spouseId,
        target: isSourceLeft ? spouseId : member.id,
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'spouseEdge',
        animated: false,
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

    const validParents = child.parentIds
      .map((pId) => memberMap.get(pId))
      .filter((p): p is FamilyMember => Boolean(p));

    if (validParents.length === 0) return;

    if (validParents.length >= 2) {
      // Married couple: determine unique pair key
      const p1 = validParents[0];
      const p2 = validParents[1];
      const unionKey = [p1.id, p2.id].sort().join('--');
      if (!unionChildrenMap.has(unionKey)) {
        unionChildrenMap.set(unionKey, { parent1: p1, parent2: p2, children: [] });
      }
      unionChildrenMap.get(unionKey)!.children.push(child);
    } else {
      // Single parent
      const p1 = validParents[0];
      const unionKey = `single--${p1.id}`;
      if (!unionChildrenMap.has(unionKey)) {
        unionChildrenMap.set(unionKey, { parent1: p1, children: [] });
      }
      unionChildrenMap.get(unionKey)!.children.push(child);
    }
  });

  // Create exactly ONE genealogical branching edge per child
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

    children.forEach((child) => {
      edges.push({
        id: `branch-${unionKey}-child-${child.id}`,
        source: parent1.id,
        target: child.id,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'parentChildBranchEdge',
        data: {
          parent1Id: parent1.id,
          parent2Id: parent2?.id,
          midX,
          midY,
          childCenterX: child.position.x + CARD_WIDTH / 2,
          childTopY: child.position.y,
        },
        style: {
          stroke: '#a3a3a3',
          strokeWidth: 1.25,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 7,
          height: 7,
          color: '#a3a3a3',
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
