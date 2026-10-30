import { FamilyMember, FamilyTreeDataset } from '../types/family';
import { INITIAL_MEMBERS } from '../data/initialData';
import { autoArrangeTree } from './treeLayout';

const STORAGE_KEY = 'kintree_family_data_v3';

export const DEFAULT_DATASET: FamilyTreeDataset = {
  meta: {
    title: 'Pohon Keluarga Besar Hadiningrat',
    description: 'Dokumentasi silsilah keluarga besar multi generasi.',
    lastModified: new Date().toISOString(),
  },
  members: autoArrangeTree(INITIAL_MEMBERS),
};

export function loadSavedTreeData(): FamilyTreeDataset {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DATASET;
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.members)) {
      return parsed;
    }
    return DEFAULT_DATASET;
  } catch (err) {
    console.error('Failed to load local storage family tree data:', err);
    return DEFAULT_DATASET;
  }
}

export function saveTreeData(dataset: FamilyTreeDataset): void {
  try {
    const payload = {
      ...dataset,
      meta: {
        ...dataset.meta,
        lastModified: new Date().toISOString(),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save family tree to local storage:', err);
  }
}

export function exportTreeToJSON(dataset: FamilyTreeDataset): void {
  const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(dataset, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const cleanTitle = (dataset.meta.title || 'family-tree')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  downloadAnchor.setAttribute('download', `${cleanTitle}-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseImportedJSON(content: string): FamilyTreeDataset {
  const parsed = JSON.parse(content);
  if (!parsed || !Array.isArray(parsed.members)) {
    throw new Error('Format berkas JSON tidak valid. Membutuhkan array anggota keluarga.');
  }

  // Validate member basic schema
  const members: FamilyMember[] = parsed.members.map((m: any, index: number) => ({
    id: String(m.id || `member-${Date.now()}-${index}`),
    fullName: String(m.fullName || 'Tanpa Nama'),
    gender: (['male', 'female', 'other'].includes(m.gender) ? m.gender : 'male') as any,
    birthYear: m.birthYear ? String(m.birthYear) : '',
    deathYear: m.deathYear ? String(m.deathYear) : '',
    isDeceased: Boolean(m.isDeceased),
    birthPlace: m.birthPlace ? String(m.birthPlace) : '',
    photoUrl: m.photoUrl ? String(m.photoUrl) : '',
    relationRole: m.relationRole ? String(m.relationRole) : '',
    notes: m.notes ? String(m.notes) : '',
    occupation: m.occupation ? String(m.occupation) : '',
    spouseIds: Array.isArray(m.spouseIds) ? m.spouseIds : [],
    parentIds: Array.isArray(m.parentIds) ? m.parentIds : [],
    childrenIds: Array.isArray(m.childrenIds) ? m.childrenIds : [],
    position: m.position && typeof m.position.x === 'number' && typeof m.position.y === 'number'
      ? { x: m.position.x, y: m.position.y }
      : { x: 100 + (index % 4) * 260, y: 100 + Math.floor(index / 4) * 220 },
  }));

  return {
    meta: {
      title: parsed.meta?.title || 'Pohon Keluarga Impor',
      description: parsed.meta?.description || '',
      lastModified: new Date().toISOString(),
    },
    members,
  };
}
