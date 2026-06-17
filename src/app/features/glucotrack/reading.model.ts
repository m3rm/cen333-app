// Shape of one reading stored in /readings on Firebase.
// `id?` is optional because new readings have no key until Firebase
// assigns one on push().
export interface Reading {
  id?: string;
  patientId: string;
  hours: number;   // hours since meal (X variable)
  glucose: number; // blood glucose mg/dL (Y variable)
}
