import React, { useState, useMemo } from 'react';
import { FamilyMember, FamilyTreeDataset } from '../../types/family';
import {
  calculateGenerations,
  compareMembersBirthOrder,
  autoArrangeTree,
} from '../../utils/treeLayout';
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  GitFork,
  Pencil,
  Trash2,
  Users,
  Briefcase,
  MapPin,
  Calendar,
  X,
  UserCheck,
  User,
  Heart,
} from 'lucide-react';

export interface FamBookViewProps {
  dataset: FamilyTreeDataset;
  onUpdateDataset: (updater: (prev: FamilyTreeDataset) => FamilyTreeDataset) => void;
  onSelectMemberInTree: (member: FamilyMember) => void;
  onOpenDetail: (member: FamilyMember) => void;
  onEditMember: (member: FamilyMember) => void;
  onDeleteMember: (member: FamilyMember) => void;
  onAddNewMember?: () => void;
  onAddChildToFamily: (targetParent: FamilyMember, coParent?: FamilyMember) => void;
  onAddSpouseToMember: (targetMember: FamilyMember) => void;
  onToast: (msg: string) => void;
  onSwitchToTree?: () => void;
}

export interface FamilyUnitItem {
  id: string;
  title: string;
  generation: number;
  parents: FamilyMember[];
  father?: FamilyMember;
  mother?: FamilyMember;
  singleParent?: FamilyMember;
  children: FamilyMember[];
}

export const FamBookView: React.FC<FamBookViewProps> = ({
  dataset,
  onUpdateDataset,
  onSelectMemberInTree,
  onOpenDetail,
  onEditMember,
  onDeleteMember,
  onAddNewMember,
  onAddChildToFamily,
  onAddSpouseToMember,
  onToast,
  onSwitchToTree,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'families' | 'all'>('families');

  // Compute generation tiers for all members
  const generations = useMemo(
    () => calculateGenerations(dataset.members),
    [dataset.members]
  );

  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    dataset.members.forEach((m) => map.set(m.id, m));
    return map;
  }, [dataset.members]);

  // Group members into family units (ayah, ibu, anak-anak)
  const familyUnits: FamilyUnitItem[] = useMemo(() => {
    const processedCouples = new Set<string>();
    const processedSingleParents = new Set<string>();
    const units: FamilyUnitItem[] = [];

    // 1. Couples with or without children
    dataset.members.forEach((member) => {
      member.spouseIds.forEach((spouseId) => {
        const spouse = memberMap.get(spouseId);
        if (!spouse) return;

        const coupleKey = [member.id, spouseId].sort().join('--');
        if (processedCouples.has(coupleKey)) return;
        processedCouples.add(coupleKey);

        const father = member.gender === 'male' ? member : spouse.gender === 'male' ? spouse : member;
        const mother = member.gender === 'female' ? member : spouse.gender === 'female' ? spouse : spouse;

        // Collective children
        const collectiveChildIds = Array.from(
          new Set([...member.childrenIds, ...spouse.childrenIds])
        );

        const children = collectiveChildIds
          .map((id) => memberMap.get(id))
          .filter((c): c is FamilyMember => Boolean(c));

        // Sort children strictly by birth order
        children.sort((c1, c2) =>
          compareMembersBirthOrder(c1, c2, member.childrenIds)
        );

        const gen = Math.min(
          generations.get(member.id) ?? 0,
          generations.get(spouse.id) ?? 0
        );

        units.push({
          id: `couple--${coupleKey}`,
          title: `Keluarga ${father.fullName} & ${mother.fullName}`,
          generation: gen,
          parents: [father, mother],
          father: father !== mother ? father : undefined,
          mother: father !== mother ? mother : undefined,
          children,
        });
      });
    });

    // 2. Single Parents
    dataset.members.forEach((member) => {
      if (member.childrenIds && member.childrenIds.length > 0) {
        const notInProcessedCouples = member.spouseIds.length === 0;

        if (notInProcessedCouples && !processedSingleParents.has(member.id)) {
          processedSingleParents.add(member.id);
          const children = member.childrenIds
            .map((id) => memberMap.get(id))
            .filter((c): c is FamilyMember => Boolean(c));

          children.sort((c1, c2) =>
            compareMembersBirthOrder(c1, c2, member.childrenIds)
          );

          const gen = generations.get(member.id) ?? 0;
          units.push({
            id: `single--${member.id}`,
            title: `Keluarga ${member.fullName}`,
            generation: gen,
            parents: [member],
            singleParent: member,
            father: member.gender === 'male' ? member : undefined,
            mother: member.gender === 'female' ? member : undefined,
            children,
          });
        }
      }
    });

    // 3. Independent / Root members without spouses or children
    dataset.members.forEach((member) => {
      if (
        member.parentIds.length === 0 &&
        member.spouseIds.length === 0 &&
        member.childrenIds.length === 0
      ) {
        const gen = generations.get(member.id) ?? 0;
        units.push({
          id: `solo--${member.id}`,
          title: member.fullName,
          generation: gen,
          parents: [member],
          singleParent: member,
          children: [],
        });
      }
    });

    // Sort families by generation level, then by parent birth order
    units.sort((a, b) => {
      if (a.generation !== b.generation) {
        return a.generation - b.generation;
      }
      const pA = a.father || a.mother || a.singleParent || a.parents[0];
      const pB = b.father || b.mother || b.singleParent || b.parents[0];
      if (pA && pB) {
        return compareMembersBirthOrder(pA, pB);
      }
      return 0;
    });

    return units;
  }, [dataset.members, memberMap, generations]);

  // Filtered families based on search query
  const filteredFamilies = useMemo(() => {
    return familyUnits.filter((unit) => {
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = unit.title.toLowerCase().includes(q);
      const inParents = unit.parents.some(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          (p.birthPlace && p.birthPlace.toLowerCase().includes(q)) ||
          (p.currentResidence && p.currentResidence.toLowerCase().includes(q)) ||
          (p.occupation && p.occupation.toLowerCase().includes(q)) ||
          (p.birthYear && p.birthYear.includes(q))
      );
      const inChildren = unit.children.some(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          (c.birthPlace && c.birthPlace.toLowerCase().includes(q)) ||
          (c.currentResidence && c.currentResidence.toLowerCase().includes(q)) ||
          (c.occupation && c.occupation.toLowerCase().includes(q)) ||
          (c.birthYear && c.birthYear.includes(q))
      );

      return inTitle || inParents || inChildren;
    });
  }, [familyUnits, searchQuery]);

  // Filtered directory of all members (for directory tab)
  const filteredDirectory = useMemo(() => {
    let list = [...dataset.members];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          (m.birthPlace && m.birthPlace.toLowerCase().includes(q)) ||
          (m.currentResidence && m.currentResidence.toLowerCase().includes(q)) ||
          (m.occupation && m.occupation.toLowerCase().includes(q)) ||
          (m.birthYear && m.birthYear.includes(q)) ||
          (m.notes && m.notes.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return list;
  }, [dataset.members, searchQuery]);

  // Reorder children manually (Move Up / Down)
  const handleReorderChild = (
    unit: FamilyUnitItem,
    childToMove: FamilyMember,
    direction: 'up' | 'down'
  ) => {
    const list = [...unit.children];
    const currentIndex = list.findIndex((c) => c.id === childToMove.id);

    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === list.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;

    const updatedChildIds = list.map((c) => c.id);

    onUpdateDataset((prev) => {
      const parentIdsToUpdate = unit.parents.map((p) => p.id);

      const updatedMembers = prev.members.map((m) => {
        // Update parent childrenIds array order
        if (parentIdsToUpdate.includes(m.id)) {
          const remainingOtherChildren = m.childrenIds.filter(
            (id) => !updatedChildIds.includes(id)
          );
          return {
            ...m,
            childrenIds: [...updatedChildIds, ...remainingOtherChildren],
          };
        }

        // Update explicit birthOrder for siblings
        const newOrderIndex = updatedChildIds.indexOf(m.id);
        if (newOrderIndex !== -1) {
          return {
            ...m,
            birthOrder: newOrderIndex + 1,
          };
        }

        return m;
      });

      // Automatically re-arrange canvas positions left-to-right
      const arranged = autoArrangeTree(updatedMembers);

      return {
        ...prev,
        members: arranged,
      };
    });

    onToast(
      `Urutan "${childToMove.fullName}" diperbarui menjadi anak ke-${targetIndex + 1}`
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex-1 w-full h-[calc(100vh-3.5rem)] overflow-y-auto bg-neutral-50/70 text-neutral-900 select-text">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Minimalist Top Header (Linear / Notion style) */}
        <div className="pb-4 border-b border-neutral-200/70">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
              Fam Book
            </h1>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              ({familyUnits.length} keluarga &bull; {dataset.members.length} anggota)
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Daftar struktur keluarga, data orang tua, dan urutan kelahiran anak.
          </p>
        </div>

        {/* Search Bar & View Tab Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab Filter */}
          <div className="flex items-center p-0.5 bg-neutral-200/50 rounded-lg border border-neutral-200/60 self-start">
            <button
              onClick={() => setActiveTab('families')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'families'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Keluarga Inti ({familyUnits.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Semua Anggota ({dataset.members.length})
            </button>
          </div>

          {/* Clean Modern Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari anggota, kota, pekerjaan..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-neutral-200/90 rounded-lg focus:outline-none focus:border-neutral-400 transition-colors shadow-2xs placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: Family Units (Minimalist Clean Cards) */}
        {activeTab === 'families' && (
          <div className="space-y-4">
            {filteredFamilies.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-12 text-center space-y-3">
                <Users className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs text-neutral-500">
                  {searchQuery
                    ? `Tidak ada keluarga yang cocok dengan "${searchQuery}".`
                    : 'Belum ada data keluarga yang tercatat.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-medium text-neutral-700 underline cursor-pointer"
                  >
                    Bersihkan pencarian
                  </button>
                )}
              </div>
            ) : (
              filteredFamilies.map((unit) => {
                return (
                  <div
                    key={unit.id}
                    className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs hover:border-neutral-300 transition-colors space-y-5"
                  >
                    {/* Family Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                      <div>
                        <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
                          {unit.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        {unit.parents.length > 0 && (
                          <button
                            onClick={() =>
                              onAddChildToFamily(unit.parents[0], unit.parents[1])
                            }
                            className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-neutral-500" />
                            <span>Tambah Anak</span>
                          </button>
                        )}
                        {unit.parents.length === 1 && (
                          <button
                            onClick={() => onAddSpouseToMember(unit.parents[0])}
                            className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-neutral-500" />
                            <span>Tambah Pasangan</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Parents Block: Ayah & Ibu */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        Orang Tua
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {unit.parents.map((parent) => {
                          const isMale = parent.gender === 'male';
                          const roleName = isMale ? 'Ayah' : 'Ibu';

                          return (
                            <div
                              key={parent.id}
                              className="p-3.5 rounded-xl border border-neutral-200/70 bg-neutral-50/40 hover:bg-white hover:border-neutral-300 transition-colors flex items-start justify-between gap-3 group"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                {/* Photo or Initials Avatar */}
                                <div className="w-10 h-10 rounded-full bg-neutral-200/70 border border-neutral-200 flex items-center justify-center font-medium text-xs text-neutral-700 shrink-0 overflow-hidden">
                                  {parent.photoUrl ? (
                                    <img
                                      src={parent.photoUrl}
                                      alt={parent.fullName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>{getInitials(parent.fullName)}</span>
                                  )}
                                </div>

                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-medium text-neutral-400">
                                      {roleName}
                                    </span>
                                    <span className="text-[10px] font-medium text-neutral-600 bg-neutral-200/60 px-1.5 py-0.5 rounded">
                                      {isMale ? 'Laki-laki' : 'Perempuan'}
                                    </span>
                                    {parent.isDeceased && (
                                      <span className="text-[10px] text-neutral-400 font-mono">
                                        &bull; Wafat{' '}
                                        {parent.deathYear ? `(${parent.deathYear})` : ''}
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="text-sm font-semibold text-neutral-900 truncate">
                                    {parent.fullName}
                                  </h3>

                                  <div className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                                    {parent.birthYear && (
                                      <span className="font-mono tabular-nums">
                                        Lahir {parent.birthYear}
                                      </span>
                                    )}
                                    {parent.birthPlace && (
                                      <span>&bull; {parent.birthPlace}</span>
                                    )}
                                    {parent.currentResidence && (
                                      <span className="text-neutral-700 font-medium">
                                        &bull; Domisili: {parent.currentResidence}
                                      </span>
                                    )}
                                    {parent.occupation && (
                                      <span className="text-neutral-500">
                                        &bull; {parent.occupation}
                                      </span>
                                    )}
                                  </div>

                                  {parent.notes && (
                                    <p className="text-[11px] text-neutral-400 line-clamp-1 italic pt-0.5">
                                      {parent.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => onSelectMemberInTree(parent)}
                                  className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                                  title="Lihat di Pohon Silsilah"
                                >
                                  <GitFork className="w-3.5 h-3.5 rotate-180" />
                                </button>
                                <button
                                  onClick={() => onOpenDetail(parent)}
                                  className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                                  title="Detail profil"
                                >
                                  <User className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onEditMember(parent)}
                                  className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Children Block: Vertical List Ordered by Birth */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        <span>Anak ({unit.children.length}) &bull; Urutan Kelahiran</span>
                        {unit.children.length > 1 && (
                          <span className="normal-case text-neutral-400 font-normal">
                            Tertua &rarr; Termuda
                          </span>
                        )}
                      </div>

                      {unit.children.length === 0 ? (
                        <div className="py-4 px-3 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-400">
                          Belum ada data anak tercatat.
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-100 border border-neutral-200/70 rounded-xl overflow-hidden bg-white">
                          {unit.children.map((child, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === unit.children.length - 1;
                            const spouses = child.spouseIds
                              .map((id) => memberMap.get(id))
                              .filter(Boolean) as FamilyMember[];

                            return (
                              <div
                                key={child.id}
                                className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50/70 transition-colors group"
                              >
                                {/* Left: Sequence Number & Profile */}
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Minimalist Index & Up/Down Reorder */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="w-5 h-5 rounded-md bg-neutral-100 text-neutral-700 font-mono text-[11px] font-semibold flex items-center justify-center">
                                      {idx + 1}
                                    </span>

                                    <div className="flex flex-col">
                                      <button
                                        onClick={() => handleReorderChild(unit, child, 'up')}
                                        disabled={isFirst}
                                        className={`p-0.5 rounded transition-colors ${
                                          isFirst
                                            ? 'text-neutral-200 cursor-not-allowed'
                                            : 'text-neutral-400 hover:text-neutral-900 cursor-pointer'
                                        }`}
                                        title={
                                          isFirst
                                            ? 'Sudah anak pertama'
                                            : 'Naikkan urutan (lebih tua)'
                                        }
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleReorderChild(unit, child, 'down')}
                                        disabled={isLast}
                                        className={`p-0.5 rounded transition-colors ${
                                          isLast
                                            ? 'text-neutral-200 cursor-not-allowed'
                                            : 'text-neutral-400 hover:text-neutral-900 cursor-pointer'
                                        }`}
                                        title={
                                          isLast
                                            ? 'Sudah anak terakhir'
                                            : 'Turunkan urutan (lebih muda)'
                                        }
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Avatar */}
                                  <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200/80 flex items-center justify-center font-medium text-[11px] text-neutral-600 shrink-0 overflow-hidden">
                                    {child.photoUrl ? (
                                      <img
                                        src={child.photoUrl}
                                        alt={child.fullName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>{getInitials(child.fullName)}</span>
                                    )}
                                  </div>

                                  {/* Child Info */}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs sm:text-sm font-medium text-neutral-900 truncate">
                                        {child.fullName}
                                      </span>
                                      <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                                        {child.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                                      </span>
                                      {child.isDeceased && (
                                        <span className="text-[10px] text-neutral-400 font-mono">
                                          &bull; Wafat{' '}
                                          {child.deathYear ? `(${child.deathYear})` : ''}
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-[11px] text-neutral-500 flex items-center gap-2 flex-wrap">
                                      <span className="font-mono tabular-nums">
                                        {child.birthYear ? `Lahir ${child.birthYear}` : '-'}
                                      </span>
                                      {child.birthPlace && (
                                        <span>&bull; {child.birthPlace}</span>
                                      )}
                                      {child.currentResidence && (
                                        <span className="text-neutral-700 font-medium">
                                          &bull; Domisili: {child.currentResidence}
                                        </span>
                                      )}
                                      {child.occupation && (
                                        <span>&bull; {child.occupation}</span>
                                      )}
                                      {spouses.length > 0 && (
                                        <span className="text-neutral-600 font-medium">
                                          &bull; Menikah dg {spouses.map((s) => s.fullName).join(', ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Clean Minimalist Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => onSelectMemberInTree(child)}
                                    className="px-2 py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Lihat di Pohon Silsilah"
                                  >
                                    <GitFork className="w-3 h-3 rotate-180" />
                                    <span className="hidden sm:inline">Pohon</span>
                                  </button>
                                  <button
                                    onClick={() => onOpenDetail(child)}
                                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors cursor-pointer"
                                    title="Detail"
                                  >
                                    <User className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onEditMember(child)}
                                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteMember(child)}
                                    className="p-1 text-neutral-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2: Complete Members Directory (Table / List) */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-2xs">
            <div className="divide-y divide-neutral-100">
              {filteredDirectory.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  Tidak ditemukan anggota keluarga.
                </div>
              ) : (
                filteredDirectory.map((m) => {
                  const parents = m.parentIds
                    .map((id) => memberMap.get(id))
                    .filter(Boolean) as FamilyMember[];
                  const spouses = m.spouseIds
                    .map((id) => memberMap.get(id))
                    .filter(Boolean) as FamilyMember[];

                  return (
                    <div
                      key={m.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-700 shrink-0 overflow-hidden">
                          {m.photoUrl ? (
                            <img
                              src={m.photoUrl}
                              alt={m.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(m.fullName)}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-medium text-neutral-900 truncate">
                              {m.fullName}
                            </h4>
                            <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                              {m.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                            </span>
                            {m.isDeceased && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                Wafat {m.deathYear ? `(${m.deathYear})` : ''}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-neutral-500 flex items-center gap-2 flex-wrap">
                            <span className="font-mono tabular-nums">
                              {m.birthYear ? `Lahir ${m.birthYear}` : '-'}
                            </span>
                            {m.birthPlace && <span>&bull; {m.birthPlace}</span>}
                            {m.currentResidence && (
                              <span className="text-neutral-700 font-medium">
                                &bull; Domisili: {m.currentResidence}
                              </span>
                            )}
                            {m.occupation && <span>&bull; {m.occupation}</span>}
                            {parents.length > 0 && (
                              <span>
                                &bull; Orang tua: {parents.map((p) => p.fullName).join(' & ')}
                              </span>
                            )}
                            {spouses.length > 0 && (
                              <span className="text-neutral-700">
                                &bull; Pasangan: {spouses.map((s) => s.fullName).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => onSelectMemberInTree(m)}
                          className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <GitFork className="w-3 h-3 rotate-180" />
                          <span>Pohon</span>
                        </button>
                        <button
                          onClick={() => onOpenDetail(m)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors cursor-pointer"
                          title="Detail"
                        >
                          <User className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditMember(m)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMember(m)}
                          className="p-1 text-neutral-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
