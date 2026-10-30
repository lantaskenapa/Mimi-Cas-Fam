import React, { useState, useRef } from 'react';
import { FamilyMember } from '../../types/family';
import {
  GitFork,
  Plus,
  LayoutGrid,
  Download,
  Upload,
  Settings,
  Search,
  Check,
  Image as ImageIcon,
  FileCode,
  RotateCcw,
  Trash,
  HelpCircle,
  Database,
} from 'lucide-react';

interface TopNavigationProps {
  treeTitle: string;
  onUpdateTitle: (title: string) => void;
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  onAddNewMember: () => void;
  onAutoArrange: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  onResetSample: () => void;
  onClearTree: () => void;
  onOpenSupabaseModal: () => void;
  isExportingImage?: boolean;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  treeTitle,
  onUpdateTitle,
  members,
  onSelectMember,
  onAddNewMember,
  onAutoArrange,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onResetSample,
  onClearTree,
  onOpenSupabaseModal,
  isExportingImage = false,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(treeTitle);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMembers = searchQuery.trim()
    ? members.filter((m) =>
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : [];

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (currentTitle.trim()) {
      onUpdateTitle(currentTitle.trim());
    } else {
      setCurrentTitle(treeTitle);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-neutral-200 px-4 md:px-6 flex items-center justify-between gap-4 z-40 select-none">
      {/* Zone 1: Brand & Tree Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
          <GitFork className="w-4 h-4 rotate-180" />
        </div>

        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="text-sm font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300 focus:outline-none"
            />
          ) : (
            <div
              onClick={() => {
                setCurrentTitle(treeTitle);
                setIsEditingTitle(true);
              }}
              title="Klik untuk mengubah nama silsilah"
              className="cursor-pointer group flex items-center gap-1.5"
            >
              <h1 className="text-sm font-bold text-neutral-900 tracking-tight whitespace-nowrap">
                {treeTitle}
              </h1>
              <span className="text-[10px] text-neutral-400 group-hover:text-neutral-600">
                (edit)
              </span>
            </div>
          )}

          {/* Unboxed subtle indicator */}
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-neutral-400 ml-1">
            <Check className="w-3 h-3 text-neutral-500" />
            Tersimpan
          </span>
        </div>
      </div>

      {/* Zone 2: Search Member in Tree */}
      <div className="relative max-w-xs w-full hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Cari anggota keluarga..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 focus:border-neutral-400 rounded-lg focus:outline-none transition-all placeholder:text-neutral-400"
          />
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-lg py-1.5 max-h-60 overflow-y-auto z-50">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectMember(m);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-neutral-900 truncate">
                    {m.fullName}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono tabular-nums shrink-0 ml-2">
                    {m.birthYear || '-'}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-neutral-400 text-center">
                Tidak ditemukan anggota &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Auto Arrange Layout */}
        <button
          onClick={onAutoArrange}
          title="Tata pohon keluarga secara otomatis rapi berdasarkan generasi"
          className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-neutral-500" />
          <span className="hidden sm:inline">Susun Otomatis</span>
        </button>

        {/* Add Member Primary Button */}
        <button
          onClick={onAddNewMember}
          className="px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Anggota</span>
        </button>

        {/* Hidden File Input for JSON import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Settings Dropdown (Contains Supabase, Export, Import, Reset, Clear) */}
        <div className="relative">
          <button
            onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
            className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${
              isSettingsMenuOpen
                ? 'bg-neutral-100 text-neutral-900 border-neutral-300'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border-neutral-200'
            }`}
            title="Pengaturan & Sinkronisasi Cloud"
          >
            <Settings className="w-4 h-4 text-neutral-600" />
          </button>

          {isSettingsMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Cloud Database
              </div>

              <button
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  onOpenSupabaseModal();
                }}
                className="w-full px-3 py-2 text-left text-xs text-neutral-800 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors group"
              >
                <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-medium text-neutral-900">Koneksi Supabase</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                    Tersedia
                  </span>
                </div>
              </button>

              <div className="my-1.5 border-t border-neutral-100" />

              <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Ekspor & Impor
              </div>

              <button
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  onExportPNG();
                }}
                disabled={isExportingImage}
                className="w-full px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-neutral-500" />
                <span>{isExportingImage ? 'Sedang mengekspor...' : 'Ekspor Gambar (PNG)'}</span>
              </button>

              <button
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  onExportJSON();
                }}
                className="w-full px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
              >
                <FileCode className="w-4 h-4 text-neutral-500" />
                <span>Cadangkan Data (JSON)</span>
              </button>

              <button
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
              >
                <Upload className="w-4 h-4 text-neutral-500" />
                <span>Impor Berkas (JSON)</span>
              </button>

              <div className="my-1.5 border-t border-neutral-100" />

              <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Kelola Pohon
              </div>

              <button
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  onResetSample();
                }}
                className="w-full px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-neutral-500" />
                <span>Muat Contoh Silsilah (Default)</span>
              </button>

              <button
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  onClearTree();
                }}
                className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
              >
                <Trash className="w-4 h-4 text-red-500" />
                <span>Kosongkan Pohon (Mulai Baru)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
