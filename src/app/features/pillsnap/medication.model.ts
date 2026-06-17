// Demo: TypeScript contract for one /medications entry — every field Gemini returns plus our metadata.
export interface Medication {
  id?: string;                  // Firebase key, added after fetch
  nickname: string;             // user's label (optional, may be '')
  name: string;                 // from Gemini
  activeIngredient: string;
  dosage: string;
  uses: string[];
  warnings: string[];
  confidence: string;           // 'high' | 'medium' | 'low'
  thumb: string;                // data URL captured by the user
  createdAt?: number;
}

// Demo: TypeScript contract for one /doses entry — references a medication by ID, never duplicates its fields.
export interface Dose {
  id?: string;
  medicationId: string;         // Firebase key of the medication
  medicationName: string;       // snapshot — used for filtering without joins
  takenAt: string;              // ISO date string the user picked
  notes: string;
  loggedAt?: number;            // server-side timestamp
}
