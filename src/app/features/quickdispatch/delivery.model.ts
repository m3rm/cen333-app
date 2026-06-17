
export interface Delivery {
  id?: string;
  customerName: string;
  weight: number;          // kg
  priority: 'Standard' | 'Express' | 'Urgent';
  lat: number;
  lng: number;
  timestamp: number;       // ms 
  instruction?: string;    // filled in by Gemini, persisted to cloud
}
