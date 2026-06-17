import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FirebaseService } from '../../services/firebase.service';
import { GeminiService } from '../../services/gemini.service';
import { Delivery } from './delivery.model';
import { haversineDistance } from './distance.helper';
import { environment } from '../../../environments/environments';

import { MContainerComponent } from
  '../../m-framework/components/m-container/m-container.component';
import { MTableComponent } from
  '../../m-framework/components/m-table/m-table.component';
import { MSearchButtonComponent } from
  '../../m-framework/components/m-search-button/m-search-button.component';
import { MDeliverymapComponent } from
  '../../m-framework/components/m-deliverymap/m-deliverymap.component';

// Table row = Delivery + distance + nearest flag.
interface DeliveryRow extends Delivery {
  distanceKm: number;
  isNearest: boolean;
}

// QuickDispatch page: form + table + map + Gemini.
@Component({
  selector: 'app-quickdispatch',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MContainerComponent,
    MTableComponent,
    MSearchButtonComponent,
    MDeliverymapComponent,
  ],
  templateUrl: './quickdispatch.component.html',
  styleUrl: './quickdispatch.component.css',
})
export class QuickdispatchComponent implements OnInit {
  // Form fields (ngModel).
  customerNameInput: string = '';
  weightInput: number | null = null;
  priorityInput: '' | 'Standard' | 'Express' | 'Urgent' = '';

  // Set by map click.
  clickedLat: number | null = null;
  clickedLng: number | null = null;

  // Form messages.
  formError: string = '';
  formSuccess: string = '';

  // Live data from Firebase.
  deliveries: Delivery[] = [];

  // Table.
  filterTerm: string = '';
  tableHeaders: string[] = ['Customer', 'Weight (kg)', 'Priority', 'Distance (km)', 'Instruction'];
  columnsToBeDisplayed: string[] = ['customerName', 'weight', 'priority', 'distanceKm', 'instruction'];

  // Map.
  selectedDeliveryId: string | null = null;
  generatingFor: string | null = null;

  // Warehouse from environment.ts.
  warehouse = environment.warehouse;

  constructor(
    private firebaseService: FirebaseService,
    private gemini: GeminiService,
  ) {}

  // Live Firebase subscription.
  ngOnInit() {
    this.firebaseService.getDeliveries((data) => {
      this.deliveries = data as Delivery[];
    });
  }

  // ---------- TABLE ROWS ----------
  // Adds distanceKm + isNearest to each delivery.
  get deliveryRows(): DeliveryRow[] {
    const wh = this.warehouse;

    // Distance for every delivery.
    const rows: DeliveryRow[] = this.deliveries.map((d) => {
      const distance = haversineDistance(wh.lat, wh.lng, Number(d.lat), Number(d.lng));
      return {
        ...d,
        distanceKm: Number(distance.toFixed(2)),
        isNearest: false,
      };
    });

    // Mark the closest one as nearest.
    if (rows.length > 0) {
      let minIdx = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].distanceKm < rows[minIdx].distanceKm) minIdx = i;
      }
      rows[minIdx].isNearest = true;
    }

    return rows;
  }

  // Id of the nearest row.
  get nearestId(): string | null {
    const nearest = this.deliveryRows.find((r) => r.isNearest);
    return nearest?.id ?? null;
  }

  // ---------- FORM SUBMISSION ----------
  saveDelivery() {
    this.formError = '';
    this.formSuccess = '';

    // Input validation (per spec).
    const name = (this.customerNameInput ?? '').trim();
    if (name.length === 0) {
      this.formError = 'Customer Name is required.';
      return;
    }

    const weight = Number(this.weightInput);
    if (this.weightInput === null || this.weightInput === undefined ||
        (this.weightInput as any) === '' || isNaN(weight)) {
      this.formError = 'Package Weight must be a number.';
      return;
    }
    if (weight <= 0) {
      this.formError = 'Package Weight must be greater than 0.';
      return;
    }
    if (weight > 50) {
      this.formError = 'Package Weight cannot exceed 50 kg.';
      return;
    }

    if (this.priorityInput === '') {
      this.formError = 'Priority must be selected.';
      return;
    }

    if (this.clickedLat === null || this.clickedLng === null) {
      this.formError = 'Click a location on the map first.';
      return;
    }

    // Save to Firebase.
    this.firebaseService.saveDelivery(
      name,
      weight,
      this.priorityInput,
      this.clickedLat,
      this.clickedLng,
    );

    this.formSuccess = `Delivery saved for ${name}.`;

    // Reset form.
    this.customerNameInput = '';
    this.weightInput = null;
    this.priorityInput = '';
    this.clickedLat = null;
    this.clickedLng = null;
  }

  // ---------- MAP CALLBACKS ----------
  // Save click coords into the form.
  onMapClick(coords: { lat: number; lng: number }) {
    this.clickedLat = coords.lat;
    this.clickedLng = coords.lng;
  }

  // Toggle marker selection (same marker = close).
  onMarkerClick(deliveryId: string) {
    if (this.selectedDeliveryId === deliveryId) {
      this.selectedDeliveryId = null;
    } else {
      this.selectedDeliveryId = deliveryId;
    }
  }

  onSearch(term: string) {
    this.filterTerm = term;
  }

 
  // Called by the info-window button.
  async onGenerateClick(deliveryId: string) {
    const d = this.deliveries.find((x) => x.id === deliveryId);
    if (!d) return;

    // Show "Generating…" state.
    this.generatingFor = deliveryId;

    try {
      const distance = haversineDistance(
        this.warehouse.lat, this.warehouse.lng,
        Number(d.lat), Number(d.lng),
      );

      const text = await this.gemini.generateInstruction(
        d.customerName, Number(d.weight), d.priority, distance,
      );

      // Save instruction to Firebase.
      await this.firebaseService.updateInstruction(deliveryId, text.trim());
    } catch (err: any) {
      console.error('Gemini call failed:', err);
      alert('Could not generate instruction. Check the API key and console.');
    } finally {
      this.generatingFor = null;
    }
  }
}
