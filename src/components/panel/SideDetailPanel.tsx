import React from 'react';
import { FamilyMember } from '../../types/family';
import { getRelatedMembers } from '../../utils/treeLayout';
import {
  X,
  Edit2,
  Trash2,
  Heart,
  Baby,
  Users,
  UserPlus,
  MapPin,
  Briefcase,
  Calendar,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface SideDetailPanelProps {
  member: FamilyMember | null;
  allMembers: FamilyMember[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
  onSelectMember: (member: FamilyMember) => void;
  onAddSpouse: (member: FamilyMember) => void;
  onAddChild: (member: FamilyMember) => void;
  onAddParent: (member: FamilyMember) => void;
  onAddSibling: (member: FamilyMember) => void;
}

export const SideDetailPanel: React.FC<SideDetailPanelProps> = ({
  member,
  allMembers,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onSelectMember,
  onAddSpouse,
  onAddChild,
  onAddParent,
  onAddSibling,
}) => {
  if (!isOpen || !member) return null;

  const { spouses, parents, children, siblings } = getRelatedMembers(
    allMembers,
    member.id
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const getLifeSpan = () => {
    if (!member.birthYear && !member.deathYear) return null;
    if (member.isDeceased) {
      return `${member.birthYear || '?'} – ${member.deathYear || 'Wafat'}`;
    }
    return member.birthYear ? `${member.birthYear} – Sekarang` : '';
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/30 backdrop-blur-2xs z-30 sm:hidden"
        onClick={onClose}
      />
      <aside
        className="fixed top-14 right-0 bottom-0 w-full sm:w-80 md:w-96 max-w-full bg-white border-l border-neutral-200 shadow-xl z-35 flex flex-col transition-transform duration-300 ease-out select-none"
        aria-label="Detail Anggota Keluarga"
      >
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Detail Anggota
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(member)}
            title="Edit Profil"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(member)}
            title="Hapus Anggota"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Tutup Panel"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Profile Identity Block */}
        <div className="flex flex-col items-center text-center pb-4 border-b border-neutral-100">
          <div className="relative mb-3">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.fullName}
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center font-semibold text-lg border-2 border-white shadow-sm ${
                  member.gender === 'male'
                    ? 'bg-neutral-100 text-neutral-800'
                    : member.gender === 'female'
                    ? 'bg-stone-100 text-stone-800'
                    : 'bg-zinc-100 text-zinc-800'
                }`}
              >
                {getInitials(member.fullName)}
              </div>
            )}
            {member.isDeceased && (
              <span
                title="Almarhum / Almarhumah"
                className="absolute bottom-0 right-0 px-1.5 py-0.5 bg-neutral-800 text-[10px] text-white rounded-full font-mono border border-white shadow-xs"
              >
                ✝ Alm
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
            {member.fullName}
          </h3>

          {member.relationRole && (
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {member.relationRole}
            </p>
          )}

          {getLifeSpan() && (
            <p className="text-xs font-mono text-neutral-400 mt-1 tabular-nums">
              {getLifeSpan()}
            </p>
          )}
        </div>

        {/* Quick Facts List */}
        <div className="space-y-2.5 text-xs">
          {member.birthPlace && (
            <div className="flex items-center gap-2.5 text-neutral-600">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>Lahir di {member.birthPlace}</span>
            </div>
          )}

          {member.occupation && (
            <div className="flex items-center gap-2.5 text-neutral-600">
              <Briefcase className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>{member.occupation}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 text-neutral-600">
            <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>
              {member.isDeceased
                ? `Wafat (${member.deathYear || 'Tahun tidak dicatat'})`
                : 'Masih Hidup'}
            </span>
          </div>

          {member.notes && (
            <div className="pt-2 text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <div className="flex items-center gap-1.5 text-neutral-400 mb-1 text-[11px] font-medium">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Catatan & Cerita:</span>
              </div>
              <p className="whitespace-pre-line text-[12px] text-neutral-700">
                {member.notes}
              </p>
            </div>
          )}
        </div>

        {/* Relationships Sections */}
        <div className="space-y-4 pt-2">
          {/* Spouses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-neutral-400" />
                Pasangan ({spouses.length})
              </span>
              <button
                onClick={() => onAddSpouse(member)}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> Tambah
              </button>
            </div>
            {spouses.length > 0 ? (
              <div className="space-y-1.5">
                {spouses.map((spouse) => (
                  <button
                    key={spouse.id}
                    onClick={() => onSelectMember(spouse)}
                    className="w-full text-left p-2 rounded-lg border border-neutral-200/80 hover:border-neutral-400 hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-neutral-900 truncate">
                        {spouse.fullName}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-mono tabular-nums">
                        {spouse.birthYear || '-'}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-neutral-400 italic">
                Belum ada pasangan terdata
              </p>
            )}
          </div>

          {/* Parents */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                Orang Tua ({parents.length})
              </span>
              <button
                onClick={() => onAddParent(member)}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> Tambah
              </button>
            </div>
            {parents.length > 0 ? (
              <div className="space-y-1.5">
                {parents.map((parent) => (
                  <button
                    key={parent.id}
                    onClick={() => onSelectMember(parent)}
                    className="w-full text-left p-2 rounded-lg border border-neutral-200/80 hover:border-neutral-400 hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-neutral-900 truncate">
                        {parent.fullName}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {parent.gender === 'female' ? 'Ibu' : 'Ayah'}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-neutral-400 italic">
                Belum ada orang tua terdata
              </p>
            )}
          </div>

          {/* Children */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                <Baby className="w-3.5 h-3.5 text-neutral-400" />
                Anak ({children.length})
              </span>
              <button
                onClick={() => onAddChild(member)}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> Tambah
              </button>
            </div>
            {children.length > 0 ? (
              <div className="space-y-1.5">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSelectMember(child)}
                    className="w-full text-left p-2 rounded-lg border border-neutral-200/80 hover:border-neutral-400 hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-neutral-900 truncate">
                        {child.fullName}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-mono tabular-nums">
                        {child.birthYear ? `Lahir ${child.birthYear}` : child.gender}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-neutral-400 italic">
                Belum ada anak terdata
              </p>
            )}
          </div>

          {/* Siblings */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                Saudara Kandung ({siblings.length})
              </span>
            </div>
            {siblings.length > 0 ? (
              <div className="space-y-1.5">
                {siblings.map((sibling) => (
                  <button
                    key={sibling.id}
                    onClick={() => onSelectMember(sibling)}
                    className="w-full text-left p-2 rounded-lg border border-neutral-200/80 hover:border-neutral-400 hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-neutral-900 truncate">
                        {sibling.fullName}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {sibling.gender === 'female' ? 'Saudari' : 'Saudara'}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-neutral-400 italic">
                {parents.length > 0
                  ? 'Anak tunggal (belum ada saudara lain)'
                  : 'Orang tua belum diisi untuk melihat saudara'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Bottom Actions */}
      <div className="p-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center gap-2">
        <button
          onClick={() => onEdit(member)}
          className="flex-1 py-2 px-3 text-xs font-medium text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit Profil
        </button>
        <button
          onClick={() => onDelete(member)}
          className="py-2 px-3 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center justify-center gap-1.5"
          title="Hapus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
    </>
  );
};
