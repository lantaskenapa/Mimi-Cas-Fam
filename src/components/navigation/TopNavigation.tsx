import React, { useState, useRef } from 'react';
import { FamilyMember } from '../../types/family';
import {
  Plus,
  Download,
  Upload,
  Settings,
  MoreVertical,
  Search,
  X,
  Image as ImageIcon,
  FileCode,
  HelpCircle,
  Database,
  Cloud,
  Check,
  RefreshCw,
} from 'lucide-react';

interface TopNavigationProps {
  treeTitle: string;
  onUpdateTitle: (title: string) => void;
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  onAddNewMember: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  onOpenSupabaseModal: () => void;
  isExportingImage?: boolean;
  cloudSyncStatus?: 'synced' | 'syncing' | 'error';
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  treeTitle,
  onUpdateTitle,
  members,
  onSelectMember,
  onAddNewMember,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onOpenSupabaseModal,
  isExportingImage = false,
  cloudSyncStatus = 'synced',
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
      {/* Zone 1: Brand Logo & Optional Tree Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <img
          src="/assets/aistudio/mimi-cas-02-01-01_0747f8f8.png"
          alt="mimi - cas ; fam."
          className="h-8 md:h-9 w-auto object-contain shrink-0"
        />

        {Boolean(
          treeTitle &&
            treeTitle.trim() &&
            treeTitle !== 'Pohon Keluarga Besar Hadiningrat'
        ) && (
          <>
            <div className="h-4 w-px bg-neutral-200 shrink-0 hidden sm:block" />

            <div className="flex items-center">
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
                  className="cursor-pointer"
                >
                  <h1 className="text-sm font-bold text-neutral-900 tracking-tight whitespace-nowrap hover:text-neutral-600 transition-colors">
                    {treeTitle}
                  </h1>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Zone 2: Search Member in Tree (Always in header for both mobile and desktop) */}
      <div className="relative flex-1 min-w-[100px] max-w-[180px] sm:max-w-xs mx-1 sm:mx-3">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Cari keluarga..."
            className="w-full pl-7 sm:pl-8 pr-7 sm:pr-8 py-1.5 text-xs bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 focus:border-neutral-400 rounded-lg focus:outline-none transition-all placeholder:text-neutral-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsSearchOpen(false)}
            />
            <div className="absolute left-0 right-0 sm:right-auto sm:w-72 top-full mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-lg py-1.5 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
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
          </>
        )}
      </div>

      {/* Zone 3: Actions & 3-Dots Menu */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Desktop: Add Member Primary Button */}
        <button
          onClick={onAddNewMember}
          className="hidden sm:flex px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors items-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Anggota</span>
        </button>

        {/* Mobile: Quick Add Button */}
        <button
          onClick={onAddNewMember}
          title="Tambah Anggota"
          className="sm:hidden p-1.5 text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center justify-center shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* 3-Dots Menu (MoreVertical) */}
        <div className="relative">
          <button
            onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors flex items-center justify-center ${
              isSettingsMenuOpen
                ? 'bg-neutral-100 text-neutral-900 border-neutral-300'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border-neutral-200'
            }`}
            title="Menu & Pengaturan"
            aria-label="Menu titik 3"
          >
            <MoreVertical className="w-4 h-4 text-neutral-700" />
          </button>

          {isSettingsMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsSettingsMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Mobile Quick Actions inside 3-dots */}
                <div className="md:hidden border-b border-neutral-100 pb-1 mb-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Aksi Pohon
                  </div>

                  <button
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      onAddNewMember();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-neutral-900 hover:bg-neutral-50 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4 text-neutral-900" />
                    <span>Tambah Anggota Baru</span>
                  </button>
                </div>

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
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {cloudSyncStatus === 'syncing' ? 'Menyimpan...' : 'Tersambung'}
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
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
