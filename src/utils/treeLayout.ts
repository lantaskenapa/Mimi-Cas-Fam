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

/**
 * Compares two members to determine their birth order (oldest to youngest).
 * Priority:
 * 1. Explicit birthOrder (e.g. 1, 2, 3...)
 * 2. Birth date / year (earlier date/year comes first)
 * 3. Parent children order if provided (manual ordering)
 * 4. Alphabetical by full name
 */
export function compareMembersBirthOrder(
  a: FamilyMember,
  b: FamilyMember,
  parentChildrenOrder?: string[]
): number {
  if (a.id === b.id) return 0;

  // 1. Explicit birthOrder (Anak ke-1, Anak ke-2)
  if (a.birthOrder !== undefined && b.birthOrder !== undefined && a.birthOrder !== b.birthOrder) {
    return a.birthOrder - b.birthOrder;
  }
  if (a.birthOrder !== undefined && b.birthOrder === undefined) return -1;
  if (a.birthOrder === undefined && b.birthOrder !== undefined) return 1;

  // 2. Parse birth date / year
  const parseBirthTime = (m: FamilyMember): number | null => {
    if (m.birthDate && m.birthDate.trim()) {
      const parsed = Date.parse(m.birthDate);
      if (!isNaN(parsed)) return parsed;
    }
    if (m.birthYear && m.birthYear.trim()) {
      const yearMatch = m.birthYear.match(/\b(18|19|20)\d{2}\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        const parsed = Date.parse(m.birthYear);
        if (!isNaN(parsed)) return parsed;
        return new Date(year, 0, 1).getTime();
      }
    }
    return null;
  };

  const tA = parseBirthTime(a);
  const tB = parseBirthTime(b);

  if (tA !== null && tB !== null && tA !== tB) {
    // Older (earlier year/date) comes first
    return tA - tB;
  }
  if (tA !== null && tB === null) return -1;
  if (tA === null && tB !== null) return 1;

  // 3. Fallback to order in parentChildrenOrder if provided
  if (parentChildrenOrder && parentChildrenOrder.length > 0) {
    const idxA = parentChildrenOrder.indexOf(a.id);
    const idxB = parentChildrenOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
      return idxA - idxB;
    }
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
  }

  // 4. Fallback to name
  return a.fullName.localeCompare(b.fullName);
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

  // Ensure bidirectional consistency between parents and children without fabricating false marriages
  members.forEach((child) => {
    if (child.parentIds && child.parentIds.length > 0) {
      child.parentIds.forEach((pId) => {
        const p = memberMap.get(pId);
        if (p && !p.childrenIds.includes(child.id)) {
          p.childrenIds.push(child.id);
        }
      });
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

      // Collect all collective children, sorted from oldest to youngest
      const collectiveChildrenRaw = Array.from(
        new Set([
          ...member.childrenIds,
          ...spouses.flatMap((s) => s.childrenIds),
        ])
      );
      const collectiveChildrenMembers = collectiveChildrenRaw
        .map((cId) => memberMap.get(cId))
        .filter(Boolean) as FamilyMember[];
      collectiveChildrenMembers.sort((c1, c2) =>
        compareMembersBirthOrder(c1, c2, member.childrenIds)
      );
      const collectiveChildren = collectiveChildrenMembers.map((c) => c.id);

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

    // Sort units in generation by parent horizontal midpoint, then by birth order for siblings
    units.sort((a, b) => {
      const aParentUnits = a.parentIds.map((pId) => unitMap.get(pId)).filter(Boolean) as FamilyUnit[];
      const bParentUnits = b.parentIds.map((pId) => unitMap.get(pId)).filter(Boolean) as FamilyUnit[];

      const aParentX = aParentUnits.length > 0
        ? aParentUnits.reduce((sum, pu) => sum + (pu.x + pu.unitWidth / 2), 0) / aParentUnits.length
        : a.x;
      const bParentX = bParentUnits.length > 0
        ? bParentUnits.reduce((sum, pu) => sum + (pu.x + pu.unitWidth / 2), 0) / bParentUnits.length
        : b.x;

      if (Math.abs(aParentX - bParentX) > 1) {
        return aParentX - bParentX;
      }

      // If they are siblings of the same parent(s), sort from oldest to youngest (left to right)
      const shareParents = a.parentIds.length > 0 && a.parentIds.some((pId) => b.parentIds.includes(pId));
      if (shareParents) {
        return compareMembersBirthOrder(a.primary, b.primary);
      }

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

        // Find all sibling units in this generation, sorted from oldest to youngest (left to right)
        const allSiblings = units
          .filter((u) => u.parentIds.some((pid) => unit.parentIds.includes(pid)))
          .sort((s1, s2) => compareMembersBirthOrder(s1.primary, s2.primary));

        if (allSiblings.length <= 1) {
          // Single child unit: center directly under parents
          preferredX = avgParentMidX - unit.unitWidth / 2;
        } else {
          // Multiple siblings: center the sibling group under parents
          const siblingIndex = allSiblings.findIndex((s) => s.id === unit.id);

          const totalSiblingWidth =
            allSiblings.reduce((sum, s) => sum + s.unitWidth + SIBLING_GAP, 0) - SIBLING_GAP;

          const groupStartX = avgParentMidX - totalSiblingWidth / 2;
          // Calculate offset up to this sibling
          let offset = 0;
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
      draggable: false,
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

  // 2. Parent-to-Children Branch Edges
  // Group all children by their parent couple / single parent
  interface FamilyUnionItem {
    unionKey: string;
    parent1: FamilyMember;
    parent2?: FamilyMember;
    children: FamilyMember[];
    isDifferentiated?: boolean;
  }

  const unionChildrenMap = new Map<string, FamilyUnionItem>();

  members.forEach((child) => {
    if (!child.parentIds || child.parentIds.length === 0) return;

    const validParents = child.parentIds
      .map((pId) => memberMap.get(pId))
      .filter((p): p is FamilyMember => Boolean(p));

    if (validParents.length === 0) return;

    const handledParentIds = new Set<string>();

    for (let i = 0; i < validParents.length; i++) {
      const p1 = validParents[i];
      if (handledParentIds.has(p1.id)) continue;

      // Check if p1 has a mutual spouse among this child's parents
      const spouseParent = validParents.find(
        (p2) => p2.id !== p1.id && p1.spouseIds.includes(p2.id) && p2.spouseIds.includes(p1.id)
      );

      if (spouseParent) {
        // Married couple union (already has love connection)
        handledParentIds.add(p1.id);
        handledParentIds.add(spouseParent.id);

        const pairKey = [p1.id, spouseParent.id].sort().join('--');
        const unionKey = `couple--${pairKey}`;

        if (!unionChildrenMap.has(unionKey)) {
          unionChildrenMap.set(unionKey, {
            unionKey,
            parent1: p1,
            parent2: spouseParent,
            children: [],
            isDifferentiated: false,
          });
        }
        unionChildrenMap.get(unionKey)!.children.push(child);
      } else {
        // Independent / separate parent (not married to child's other parent)
        handledParentIds.add(p1.id);

        // "garis orang tua baru menuju anak dibedakan garisnya"
        // If the child has multiple parents and this parent is not the first, or added separately:
        const isDifferentiated = validParents.length > 1 && validParents.indexOf(p1) > 0;

        const unionKey = `single--${p1.id}--diff-${isDifferentiated ? '1' : '0'}`;
        if (!unionChildrenMap.has(unionKey)) {
          unionChildrenMap.set(unionKey, {
            unionKey,
            parent1: p1,
            children: [],
            isDifferentiated,
          });
        }
        unionChildrenMap.get(unionKey)!.children.push(child);
      }
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
    isDifferentiated?: boolean;
  }

  const unionList: FamilyUnion[] = [];

  unionChildrenMap.forEach(({ parent1, parent2, children, isDifferentiated }, unionKey) => {
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

    // Sort children strictly from left to right (oldest to youngest)
    children.sort((c1, c2) => c1.position.x - c2.position.x);

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
      isDifferentiated,
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

    // Track slots with 20px separation: 0, +20, -20, +40, -40, +60, -60
    const trackOffsets = [0, 20, -20, 40, -40, 60, -60];
    let chosenBusY = baseBusY;

    for (const offset of trackOffsets) {
      const candidateBusY = baseBusY + offset;

      // Safe margin >= 20px from parent bottom and child top
      if (
        candidateBusY < union.maxParentBottom + 20 ||
        candidateBusY > union.minChildTop - 20
      ) {
        continue;
      }

      // Check for collision with any other family's bus in this generation tier
      const hasCollision = allocatedBusBands.some((allocated) => {
        const sameTier = Math.abs(allocated.tierY - union.maxParentBottom) < 60;
        if (!sameTier) return false;

        const altitudeTooClose = Math.abs(allocated.busY - candidateBusY) < 18;
        if (!altitudeTooClose) return false;

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

  // Create genealogical branching edge per child
  unionList.forEach((union) => {
    const { parent1, parent2, children, unionKey, midX, midY, busY, isDifferentiated } = union;

    children.forEach((child, index) => {
      const edgeId = `branch-${unionKey}-child-${child.id}`;
      const isHighlighted =
        highlightedEdgeIds.has(edgeId) ||
        ((highlightedMemberIds.has(parent1.id) || (parent2 && highlightedMemberIds.has(parent2.id))) &&
          highlightedMemberIds.has(child.id));
      const isDimmed = hasActiveSelection && !isHighlighted;

      const strokeColor = isHighlighted
        ? isDifferentiated
          ? '#1d4ed8'
          : '#0f172a'
        : isDimmed
        ? isDifferentiated
          ? '#93c5fd'
          : '#cbd5e1'
        : isDifferentiated
        ? '#2563eb'
        : '#94a3b8';

      edges.push({
        id: edgeId,
        source: parent1.id,
        target: child.id,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'parentChildBranchEdge',
        zIndex: isHighlighted ? 100 : isDifferentiated ? 10 : 1,
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
          isDifferentiated,
        },
        style: {
          stroke: strokeColor,
          strokeWidth: isHighlighted ? 2.75 : isDifferentiated ? 2 : 1.5,
          strokeDasharray: isDifferentiated ? '6, 4' : undefined,
          opacity: isDimmed ? 0.22 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: isHighlighted ? 8 : 7,
          height: isHighlighted ? 8 : 7,
          color: strokeColor,
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
      ((m.parentIds.length > 0 && current.parentIds.some((pId) => m.parentIds.includes(pId))) ||
        (current.siblingIds && current.siblingIds.includes(m.id)) ||
        (m.siblingIds && m.siblingIds.includes(current.id)))
  );

  return {
    spouses,
    parents,
    children,
    siblings,
  };
}
