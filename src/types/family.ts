export type Gender = 'male' | 'female' | 'other';

export interface FamilyMember {
  id: string;
  fullName: string;
  gender: Gender;
  birthYear?: string;
  birthDate?: string; // Full date format (e.g. "1998-05-12" or "12 Mei 1998")
  deathYear?: string;
  isDeceased?: boolean;
  birthPlace?: string;
  currentResidence?: string; // Domisili sekarang
  photoUrl?: string;
  relationRole?: string; // e.g. "Kakek", "Nenek", "Ayah", "Ibu", "Anak Pertama", "Cucu"
  notes?: string;
  occupation?: string;
  birthOrder?: number; // 1, 2, 3... explicit birth order (Anak ke-N), supports manual override
  
  // Relationship links
  spouseIds: string[];
  parentIds: string[];
  childrenIds: string[];
  siblingIds?: string[];
  
  // Canvas coordinate
  position: {
    x: number;
    y: number;
  };
}

export interface FamilyTreeMeta {
  title: string;
  description?: string;
  lastModified: string;
}

export interface FamilyTreeDataset {
  meta: FamilyTreeMeta;
  members: FamilyMember[];
}
