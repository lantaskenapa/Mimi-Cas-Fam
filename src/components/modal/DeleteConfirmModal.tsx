import React from 'react';
import { FamilyMember } from '../../types/family';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  member: FamilyMember | null;
  onClose: () => void;
  onConfirm: (member: FamilyMember) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  member,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-neutral-900 mb-1">
            Hapus Anggota Keluarga?
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Apakah Anda yakin ingin menghapus{' '}
            <span className="font-semibold text-neutral-800">
              &ldquo;{member.fullName}&rdquo;
            </span>{' '}
            dari pohon keluarga? Hubungan relasi terkait akan otomatis disesuaikan.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(member);
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors"
          >
            Hapus Anggota
          </button>
        </div>
      </div>
    </div>
  );
};
