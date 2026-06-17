import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, update, remove }
  from 'firebase/database';
import { environment } from '../../environments/environments';

@Injectable({ providedIn: 'root' })
export class FirebaseService {

  private db: any;

  constructor() {
    const app = initializeApp(environment.firebaseConfig);
    this.db = getDatabase(app);
  }

  // ===== VitalTrend (App 3 - heart rate) — /readings =====
  saveReading(age: number, heartRate: number): Promise<void> {
    const readingsRef = ref(this.db, 'readings');
    return push(readingsRef, {
      age: age,
      heartRate: heartRate,
      timestamp: new Date().toISOString()
    }).then(() => {});
  }

  getReadings(callback: (readings: any[]) => void): void {
    const readingsRef = ref(this.db, 'readings');
    onValue(readingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const readings = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        callback(readings);
      } else {
        callback([]);
      }
    });
  }

  // ===== GlucoTrack (App 3 alt - glucose) — /glucose_readings =====
  saveGlucoseReading(patientId: string, hours: number, glucose: number): void {
    const readingsRef = ref(this.db, 'glucose_readings');
    push(readingsRef, { patientId, hours, glucose });
  }

  getGlucoseReadings(callback: (readings: any[]) => void): void {
    const readingsRef = ref(this.db, 'glucose_readings');
    onValue(readingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const readings = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        callback(readings);
      } else {
        callback([]);
      }
    });
  }

  // ===== QuickDispatch (App 4 alt - deliveries) — /deliveries =====
  saveDelivery(
    customerName: string,
    weight: number,
    priority: 'Standard' | 'Express' | 'Urgent',
    lat: number,
    lng: number,
  ): void {
    const deliveriesRef = ref(this.db, 'deliveries');
    push(deliveriesRef, {
      customerName, weight, priority, lat, lng,
      timestamp: Date.now(),
    });
  }

  getDeliveries(callback: (deliveries: any[]) => void): void {
    const deliveriesRef = ref(this.db, 'deliveries');
    onValue(deliveriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deliveries = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        callback(deliveries);
      } else {
        callback([]);
      }
    });
  }

  async updateInstruction(deliveryId: string, instruction: string): Promise<void> {
    const deliveryRef = ref(this.db, `deliveries/${deliveryId}`);
    await update(deliveryRef, { instruction });
  }

  // ===== PillSnap (Assignment 5) — /medications and /doses =====

  // Demo: pushes one medication onto /medications. Firebase generates the key automatically.
  saveMedication(entry: any): void {
    const medsRef = ref(this.db, 'medications');
    push(medsRef, { ...entry, createdAt: Date.now() });
  }

  // Demo: onValue is the live cloud subscription — fires once on load AND every time anything changes.
  getMedications(callback: (meds: any[]) => void): void {
    const medsRef = ref(this.db, 'medications');
    onValue(medsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const meds = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        callback(meds);
      } else {
        callback([]);
      }
    });
  }

  // Demo: pushes a dose log onto /doses with a server-side timestamp for "most recent".
  saveDose(entry: any): void {
    const dosesRef = ref(this.db, 'doses');
    push(dosesRef, { ...entry, loggedAt: Date.now() });
  }

  // Demo: live subscription to /doses — drives the history table and the 7-day chart.
  getDoses(callback: (doses: any[]) => void): void {
    const dosesRef = ref(this.db, 'doses');
    onValue(dosesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const doses = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        callback(doses);
      } else {
        callback([]);
      }
    });
  }
}