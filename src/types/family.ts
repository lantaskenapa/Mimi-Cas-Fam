export type Gender = 'male' | 'female' | 'other';

export interface FamilyMember {
  id: string;
  fullName: string;
  gender: Gender;
  birthYear?: string;
  deathYear?: string;
  isDeceased?: boolean;
  birthPlace?: string;
  photoUrl?: string;
  relationRole?: string; // e.g. "Kakek", "Nenek", "Ayah", "Ibu", "Anak Pertama", "Cucu"
  notes?: string;
  occupation?: string;
  
  // Relationship links
  spouseIds: string[];
  parentIds: string[];
  childrenIds: string[];
  
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
