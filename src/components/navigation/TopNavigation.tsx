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
  GitFork,
  BookOpen,
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
  cloudSyncStatus?: 'synced' | 'syncing' | 'error' | 'disconnected';
  activeView?: 'tree' | 'fambook';
  onChangeView?: (view: 'tree' | 'fambook') => void;
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
  activeView = 'tree',
  onChangeView,
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
    <header className="h-14 bg-white border-b border-neutral-200 px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4 z-40 select-none">
      {/* Zone 1: Brand Logo & View Switcher */}
      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
        <img
          src="/assets/aistudio/mimi-cas-02-01-01_0747f8f8.png"
          alt="mimi - cas ; fam."
          className="h-7 sm:h-8 md:h-9 w-auto object-contain shrink-0"
        />

        {/* View Switcher: Pohon Silsilah vs Fam Book */}
        {onChangeView && (
          <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg border border-neutral-200/70">
            <button
              onClick={() => onChangeView('tree')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'tree'
                  ? 'bg-white text-neutral-900 shadow-2xs font-medium'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title="Bagan Pohon Silsilah"
            >
              <GitFork className="w-3.5 h-3.5 rotate-180" />
              <span className="hidden sm:inline">Pohon</span>
            </button>

            <button
              onClick={() => onChangeView('fambook')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'fambook'
                  ? 'bg-white text-neutral-900 shadow-2xs font-medium'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title="Fam Book"
            >
              <BookOpen className="w-3.5 h-3.5 text-neutral-700" />
              <span>Fam Book</span>
            </button>
          </div>
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

      {/* Zone 3: 3-Dots Menu */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* 3-Dots Menu (MoreVertical) */}
        <div className="relative">
          <button
            onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors flex items-center justify-center cursor-pointer ${
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
                {/* Tambah Anggota Baru */}
                <div className="border-b border-neutral-100 pb-1 mb-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Kelola Silsilah
                  </div>

                  <button
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      onAddNewMember();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-neutral-900 hover:bg-neutral-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
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
                  <Database className={`w-4 h-4 shrink-0 ${cloudSyncStatus === 'synced' ? 'text-emerald-600' : 'text-neutral-500'}`} />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium text-neutral-900">Koneksi Supabase</span>
                    {cloudSyncStatus === 'disconnected' ? (
                      <span className="text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 font-medium">
                        Lokal / Offline
                      </span>
                    ) : cloudSyncStatus === 'syncing' ? (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Menyimpan...
                      </span>
                    ) : cloudSyncStatus === 'synced' ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Tersambung
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 font-medium flex items-center gap-1">
                        Gagal Sync
                      </span>
                    )}
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
