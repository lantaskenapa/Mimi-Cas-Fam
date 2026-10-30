import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FamilyMember } from '../../types/family';
import {
  Heart,
  Baby,
  Users,
  UserPlus,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';

export interface FamilyNodeData {
  member: FamilyMember;
  isSelected?: boolean;
  onSelect: (member: FamilyMember) => void;
  onOpenDetail: (member: FamilyMember) => void;
  onAddSpouse: (member: FamilyMember) => void;
  onAddChild: (member: FamilyMember) => void;
  onAddParent: (member: FamilyMember) => void;
  onAddSibling: (member: FamilyMember) => void;
  onEdit: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
}

export const FamilyNode = memo(({ data }: NodeProps<any>) => {
  const member: FamilyMember = data.member;
  const isSelected = data.isSelected;
  const alreadyMarried = member.spouseIds && member.spouseIds.length >= 1;

  // Format year strictly as requested:
  // If deceased: (1965 - 1999)
  // If alive: (1970)
  const getYearDisplay = () => {
    if (!member.birthYear && !member.deathYear) return null;
    if (member.isDeceased) {
      const birth = member.birthYear || '?';
      const death = member.deathYear || '?';
      return `(${birth} - ${death})`;
    }
    return member.birthYear ? `(${member.birthYear})` : null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const isMale = member.gender === 'male';
  const isFemale = member.gender === 'female';

  return (
    <div className={isSelected ? 'relative z-[1000]' : 'relative z-0'}>
      {/* Vertical Contextual Action Menu when card is clicked / selected */}
      {isSelected && (
        <div
          className="absolute left-[calc(100%+10px)] top-0 w-44 bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.18)] p-1.5 flex flex-col gap-0.5 z-[9999] animate-in fade-in zoom-in-95 duration-150 nodrag nopan select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Detail */}
          <button
            onClick={() => data.onOpenDetail(member)}
            title="Lihat Detail Profil"
            className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>Detail</span>
          </button>

          {/* Tambah Pasangan: enabled even if already married as requested */}
          <button
            onClick={() => data.onAddSpouse(member)}
            title="Tambah Pasangan (Suami/Istri)"
            className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Tambah Pasangan</span>
          </button>

          {/* Tambah Anak */}
          <button
            onClick={() => data.onAddChild(member)}
            title="Tambah Anak"
            className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <Baby className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>Tambah Anak</span>
          </button>

          {/* Tambah Orang Tua */}
          <button
            onClick={() => data.onAddParent(member)}
            title="Tambah Orang Tua (Ayah/Ibu)"
            className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>Tambah Orang Tua</span>
          </button>

          {/* Tambah Saudara */}
          <button
            onClick={() => data.onAddSibling(member)}
            title="Tambah Saudara Kandung"
            className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>Tambah Saudara</span>
          </button>

          <div className="my-1 border-t border-neutral-100" />

          {/* Edit Profil */}
          <button
            onClick={() => data.onEdit(member)}
            title="Edit Profil"
            className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>Edit Profil</span>
          </button>

          {/* Hapus */}
          <button
            onClick={() => data.onDelete(member)}
            title="Hapus Anggota"
            className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Hapus</span>
          </button>
        </div>
      )}

      {/* Main Family Card with modern subtle shadow */}
      <div
        onClick={() => data.onSelect(member)}
        className={`group relative w-[230px] bg-white rounded-xl transition-all duration-200 cursor-pointer select-none ${
          isSelected
            ? 'ring-2 ring-neutral-900 shadow-[0_10px_28px_-4px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.06)] border-neutral-400'
            : 'border border-neutral-200/90 hover:border-neutral-300 shadow-[0_4px_18px_-2px_rgba(0,0,0,0.06),0_2px_6px_-1px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_-4px_rgba(0,0,0,0.09),0_3px_8px_-1px_rgba(0,0,0,0.04)]'
        }`}
      >
        {/* Target Handles for Connections */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="!w-2 !h-2 !bg-neutral-400 !border-2 !border-white transition-opacity group-hover:opacity-100 opacity-0"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className="!w-2 !h-2 !bg-neutral-600 !border-2 !border-white transition-opacity group-hover:opacity-100 opacity-0"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="!w-2 !h-2 !bg-neutral-400 !border-2 !border-white transition-opacity group-hover:opacity-100 opacity-0"
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="!w-2 !h-2 !bg-neutral-400 !border-2 !border-white transition-opacity group-hover:opacity-100 opacity-0"
        />

        {/* Minimalist Card Body: Avatar, Name, and Year only */}
        <div className="p-3.5 flex items-center gap-3">
          {/* Avatar circle */}
          <div className="relative shrink-0">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.fullName}
                className="w-11 h-11 rounded-full object-cover border border-neutral-200 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-xs tracking-wider border shadow-xs ${
                  isMale
                    ? 'bg-neutral-100 text-neutral-700 border-neutral-200'
                    : isFemale
                    ? 'bg-stone-100 text-stone-700 border-stone-200'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                {getInitials(member.fullName || 'NN')}
              </div>
            )}
            {member.isDeceased && (
              <span
                title="Almarhum / Almarhumah"
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-neutral-800 text-[9px] text-white rounded-full flex items-center justify-center border border-white"
              >
                ✝
              </span>
            )}
          </div>

          {/* Info: strictly Full Name & Year */}
          <div className="min-w-0 flex-1">
            <h4
              className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-1"
              title={member.fullName}
            >
              {member.fullName}
            </h4>

            {getYearDisplay() && (
              <p className="text-xs text-neutral-500 font-mono tabular-nums mt-0.5">
                {getYearDisplay()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

FamilyNode.displayName = 'FamilyNode';
