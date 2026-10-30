import React, { useState, useEffect } from 'react';
import {
  SupabaseConfig,
  loadSupabaseConfig,
  saveSupabaseConfig,
  testConnection,
  saveTreeToCloud,
  loadTreeFromCloud,
} from '../../utils/supabase';
import { FamilyTreeDataset } from '../../types/family';
import {
  X,
  Database,
  Cloud,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: FamilyTreeDataset;
  onDatasetLoaded: (data: FamilyTreeDataset) => void;
  onToast: (msg: string) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onDatasetLoaded,
  onToast,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(() => loadSupabaseConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(loadSupabaseConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    saveSupabaseConfig(config);
    onToast('Konfigurasi Supabase disimpan');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    handleSaveConfig();
    const res = await testConnection(config);
    setTesting(false);
    setTestResult(res);
  };

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    handleSaveConfig();
    const res = await saveTreeToCloud('default-family-tree', dataset, config);
    setIsSaving(false);
    if (res.success) {
      onToast('Silsilah berhasil disimpan ke Supabase Cloud!');
      setTestResult({ success: true, message: 'Data silsilah aktif tersimpan di cloud.' });
    } else {
      setTestResult({ success: false, message: res.error || 'Gagal menyimpan ke cloud.' });
    }
  };

  const handleLoadFromCloud = async () => {
    if (
      !window.confirm(
        'Ambil silsilah dari Supabase? Data pohon yang belum tersimpan lokal akan digantikan.'
      )
    ) {
      return;
    }
    setIsLoadingCloud(true);
    const res = await loadTreeFromCloud('default-family-tree', config);
    setIsLoadingCloud(false);
    if (res.success && res.dataset) {
      onDatasetLoaded(res.dataset);
      onToast('Silsilah berhasil dimuat dari Supabase!');
      onClose();
    } else {
      setTestResult({ success: false, message: res.error || 'Gagal memuat dari cloud.' });
    }
  };

  const sqlSchema = `-- Jalankan perintah ini di Supabase SQL Editor jika tabel belum dibuat:
create table if not exists family_trees (
  id text primary key,
  title text,
  data jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Buka izin akses sederhana untuk aplikasi pohon keluarga:
alter table family_trees enable row level security;
create policy "Public Access Policy" on family_trees 
  for all 
  using (true) 
  with check (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                Koneksi Supabase Cloud
              </h3>
              <p className="text-xs text-neutral-500">
                Sinkronkan silsilah keluarga ke database PostgreSQL cloud Anda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Supabase URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
              <span>Project URL</span>
              <span className="text-[11px] text-neutral-400 font-normal">
                https://xxx.supabase.co
              </span>
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
            />
          </div>

          {/* Anon Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
              <span>API Anon / Public Key</span>
              <span className="text-[11px] text-neutral-400 font-normal">
                JWT public token
              </span>
            </label>
            <textarea
              rows={2}
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsIn..."
              className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Table Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Nama Tabel Database
            </label>
            <input
              type="text"
              value={config.table}
              onChange={(e) => setConfig({ ...config, table: e.target.value })}
              placeholder="family_trees"
              className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
            />
          </div>

          {/* Connection Test Results */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50/80 border-amber-200 text-amber-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons: Test, Save to Cloud, Load from Cloud */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="py-2 px-3 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className="py-2 px-3 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Cloud'}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadFromCloud}
              disabled={isLoadingCloud}
              className="py-2 px-3 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isLoadingCloud ? 'Memuat...' : 'Tarik Cloud'}</span>
            </button>
          </div>

          {/* SQL Setup Helper Accordion */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50/50">
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-neutral-700 flex items-center justify-between hover:bg-neutral-100/60 transition-colors"
            >
              <span>Belum membuat tabel di Supabase? Lihat SQL Schema</span>
              <span className="text-[11px] text-neutral-400">
                {showSql ? 'Sembunyikan' : 'Buka'}
              </span>
            </button>

            {showSql && (
              <div className="p-3 border-t border-neutral-200 bg-neutral-900 text-neutral-200 text-[11px] font-mono relative">
                <button
                  onClick={copySqlToClipboard}
                  className="absolute top-2 right-2 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[10px] flex items-center gap-1 border border-neutral-700 transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin SQL</span>
                    </>
                  )}
                </button>
                <pre className="overflow-x-auto whitespace-pre-wrap pr-16">{sqlSchema}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoSync}
                onChange={(e) => {
                  const updated = { ...config, autoSync: e.target.checked };
                  setConfig(updated);
                  saveSupabaseConfig(updated);
                  onToast(
                    updated.autoSync
                      ? 'Sinkronisasi otomatis Supabase diaktifkan'
                      : 'Sinkronisasi otomatis dinonaktifkan'
                  );
                }}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-3.5 h-3.5"
              />
              <span>Sinkronisasi otomatis saat ada perubahan</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              handleSaveConfig();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
