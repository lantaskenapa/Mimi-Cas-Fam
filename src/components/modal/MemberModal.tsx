import React, { useState, useEffect } from 'react';
import { FamilyMember, Gender } from '../../types/family';
import { X, Upload, Trash2, Camera, Crop } from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<FamilyMember>) => void;
  initialData?: FamilyMember | null;
  mode: 'create' | 'edit';
  relationContext?: {
    type: 'spouse' | 'child' | 'parent' | 'sibling';
    targetMember: FamilyMember;
  } | null;
  allMembers?: FamilyMember[];
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
  relationContext,
  allMembers = [],
}) => {
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [isDeceased, setIsDeceased] = useState(false);
  const [birthPlace, setBirthPlace] = useState('');
  const [relationRole, setRelationRole] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [tempImageToCrop, setTempImageToCrop] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);

  // Selected relationships when editing
  const [selectedSpouseIds, setSelectedSpouseIds] = useState<string[]>([]);
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([]);
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setImageError(null);

    if (initialData && mode === 'edit') {
      setFullName(initialData.fullName || '');
      setGender(initialData.gender || 'male');
      setBirthYear(initialData.birthYear || '');
      setDeathYear(initialData.deathYear || '');
      setIsDeceased(Boolean(initialData.isDeceased));
      setBirthPlace(initialData.birthPlace || '');
      setRelationRole(initialData.relationRole || '');
      setNotes(initialData.notes || '');
      setPhotoUrl(initialData.photoUrl || '');
      setSelectedSpouseIds(initialData.spouseIds || []);
      setSelectedParentIds(initialData.parentIds || []);
      setSelectedChildrenIds(initialData.childrenIds || []);
    } else {
      // Reset defaults
      setFullName('');
      setBirthYear('');
      setDeathYear('');
      setIsDeceased(false);
      setBirthPlace('');
      setNotes('');
      setPhotoUrl('');
      setSelectedSpouseIds([]);
      setSelectedParentIds([]);
      setSelectedChildrenIds([]);

      // Auto-configure depending on relationContext
      if (relationContext) {
        const target = relationContext.targetMember;
        if (relationContext.type === 'spouse') {
          setGender(target.gender === 'male' ? 'female' : 'male');
          setRelationRole('');
          setSelectedSpouseIds([target.id]);
        } else if (relationContext.type === 'child') {
          setGender('male');
          setRelationRole('');
          // Add target parent and any spouse of target as parents
          const parents = [target.id, ...target.spouseIds];
          setSelectedParentIds(parents);
        } else if (relationContext.type === 'parent') {
          const existingParentIds = target.parentIds || [];
          if (existingParentIds.length > 0) {
            const firstParent = allMembers.find((m) => m.id === existingParentIds[0]);
            setGender(firstParent && firstParent.gender === 'male' ? 'female' : 'male');
            setSelectedSpouseIds([existingParentIds[0]]);
          } else {
            setGender('male');
            setSelectedSpouseIds([]);
          }
          setRelationRole('');
          setSelectedChildrenIds([target.id]);
        } else if (relationContext.type === 'sibling') {
          setGender(target.gender === 'male' ? 'female' : 'male');
          setRelationRole('');
          setSelectedParentIds(target.parentIds || []);
        }
      } else {
        setGender('male');
        setRelationRole('');
      }
    }
  }, [isOpen, initialData, mode, relationContext]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setImageError('Ukuran foto terlalu besar. Maksimal 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setTempImageToCrop(uploadEvent.target.result as string);
          setIsCropperOpen(true);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleConfirmCrop = (croppedUrl: string) => {
    setPhotoUrl(croppedUrl);
    setIsCropperOpen(false);
    setTempImageToCrop(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    onSave({
      fullName: fullName.trim(),
      gender,
      birthYear: birthYear.trim(),
      deathYear: isDeceased ? deathYear.trim() : '',
      isDeceased,
      birthPlace: birthPlace.trim(),
      relationRole: relationRole.trim(),
      occupation: (mode === 'edit' && initialData?.occupation) || '',
      notes: notes.trim(),
      photoUrl,
      spouseIds: selectedSpouseIds,
      parentIds: selectedParentIds,
      childrenIds: selectedChildrenIds,
    });
    onClose();
  };

  const getModalTitle = () => {
    if (mode === 'edit') return 'Edit Anggota Keluarga';
    if (!relationContext) return 'Tambah Anggota Keluarga Baru';
    const targetName = relationContext.targetMember.fullName;
    switch (relationContext.type) {
      case 'spouse':
        return `Tambah Pasangan untuk ${targetName}`;
      case 'child':
        return `Tambah Anak untuk ${targetName}`;
      case 'parent':
        return `Tambah Orang Tua untuk ${targetName}`;
      case 'sibling':
        return `Tambah Saudara Kandung untuk ${targetName}`;
      default:
        return 'Tambah Anggota Keluarga';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              {getModalTitle()}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Lengkapi informasi profil dan silsilah keluarga.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {/* Photo & Basic Info Row */}
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              {photoUrl ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-neutral-200 shadow-xs">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/55 text-white flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setTempImageToCrop(photoUrl);
                        setIsCropperOpen(true);
                      }}
                      className="p-1 hover:text-amber-300 transition-colors"
                      title="Sesuaikan / Crop Foto"
                    >
                      <Crop className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="p-1 hover:text-red-400 transition-colors"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="w-16 h-16 rounded-full border-2 border-dashed border-neutral-300 hover:border-neutral-500 flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-neutral-600 bg-neutral-50 transition-colors">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 font-medium">Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-700">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                {photoUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTempImageToCrop(photoUrl);
                        setIsCropperOpen(true);
                      }}
                      className="text-[11px] font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1 hover:underline"
                    >
                      <Crop className="w-3 h-3 text-neutral-500" />
                      <span>Sesuaikan Foto</span>
                    </button>
                  </div>
                )}
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Raden Suryo Hadiningrat"
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                autoFocus
              />
            </div>
          </div>

          {imageError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
              {imageError}
            </div>
          )}

          {/* Gender */}
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1.5">
              Jenis Kelamin
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-lg text-xs max-w-xs">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-1.5 rounded-md font-medium transition-colors ${
                  gender === 'male'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Pria
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-1.5 rounded-md font-medium transition-colors ${
                  gender === 'female'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Wanita
              </button>
            </div>
          </div>

          {/* Birth & Death Years */}
          <div className="space-y-3">
            <div className={`grid gap-3 ${isDeceased ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1.5">
                  Tahun Lahir
                </label>
                <input
                  type="text"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="Contoh: 1975"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
              </div>

              {isDeceased && (
                <div className="animate-in fade-in duration-150">
                  <label className="text-xs font-medium text-neutral-700 block mb-1.5">
                    Tahun Wafat
                  </label>
                  <input
                    type="text"
                    value={deathYear}
                    onChange={(e) => setDeathYear(e.target.value)}
                    placeholder="Contoh: 2021"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Checkbox Status Almarhum */}
            <div className="flex items-center">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDeceased}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsDeceased(checked);
                    if (!checked) setDeathYear('');
                  }}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-4 h-4 cursor-pointer"
                />
                <span>Status Almarhum / Almarhumah</span>
              </label>
            </div>
          </div>

          {/* Birth Place */}
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1.5">
              Kota / Tempat Lahir
            </label>
            <input
              type="text"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="Contoh: Yogyakarta"
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
            />
          </div>

          {/* Bio & Notes */}
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1.5">
              Catatan & Cerita Hidup
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan mengenai riwayat hidup, hobi, kenangan, atau pesan khusus..."
              className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors"
            >
              {mode === 'edit' ? 'Simpan Perubahan' : 'Tambahkan ke Pohon'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Crop / Adjust Image Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={tempImageToCrop || ''}
        onClose={() => {
          setIsCropperOpen(false);
          setTempImageToCrop(null);
        }}
        onConfirm={handleConfirmCrop}
      />
    </div>
  );
};
