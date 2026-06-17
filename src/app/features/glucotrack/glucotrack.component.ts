import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FirebaseService } from '../../services/firebase.service';
import { Reading } from './reading.model';
import { evaluatePolynomial, polynomialRegression } from './regression.helper';

import { MContainerComponent } from
  '../../m-framework/components/m-container/m-container.component';
import { MTableComponent } from
  '../../m-framework/components/m-table/m-table.component';
import { MSearchButtonComponent } from
  '../../m-framework/components/m-search-button/m-search-button.component';
import { MRegressionchartComponent } from
  '../../m-framework/components/m-regressionchart/m-regressionchart.component';

 
@Component({
  selector: 'app-glucotrack',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MContainerComponent,
    MTableComponent,
    MSearchButtonComponent,
    MRegressionchartComponent,
  ],
  templateUrl: './glucotrack.component.html',
  styleUrl: './glucotrack.component.css',
})
export class GlucotrackComponent implements OnInit {
 
  patientIdInput: string = '';
  hoursInput: number = 0;
  glucoseInput: number = 0;

  // form feedback
  formError: string = '';
  formSuccess: string = '';

  // ---- cloud-synced state ----
  readings: Reading[] = [];
  filterTerm: string = '';

  // ---- regression / prediction ----
  selectedDegree: number = 1;
  predictX: number | null = null;
  predictedY: number | null = null;

  // The constructor is where Angular INJECTS the FirebaseService. 
  
  constructor(private firebaseService: FirebaseService) {}

  // ngOnInit subscribes to the cloud database. 
   ngOnInit() {
    this.firebaseService.getGlucoseReadings((data) => {
      this.readings = data as Reading[];
      this.hoursArray = this.readings.map(r => Number(r.hours));
      this.glucoseArray = this.readings.map(r => Number(r.glucose));
      this.recomputePrediction();
    });
 }


  saveReading() {
    this.formError = '';
    this.formSuccess = '';

    const id = (this.patientIdInput ?? '').trim();
    if (id.length === 0) {
      this.formError = 'Patient ID is required.';
      return;
    }

    const hours = Number(this.hoursInput);
    if (this.hoursInput === null || this.hoursInput === undefined ||
        (this.hoursInput as any) === '' || isNaN(hours)) {
      this.formError = 'Hours Since Meal must be a number.';
      return;
    }
    if (hours < 0) {
      this.formError = 'Hours Since Meal cannot be negative.';
      return;
    }
    if (hours > 12) {
      this.formError = 'Hours Since Meal cannot exceed 12.';
      return;
    }

    const glucose = Number(this.glucoseInput);
    if (this.glucoseInput === null || this.glucoseInput === undefined ||
        (this.glucoseInput as any) === '' || isNaN(glucose)) {
      this.formError = 'Blood Glucose must be a number.';
      return;
    }
    if (glucose <= 0) {
      this.formError = 'Blood Glucose must be greater than 0.';
      return;
    }
    if (glucose > 600) {
      this.formError = 'Blood Glucose cannot exceed 600 mg/dL.';
      return;
    }

    // Write to Firebase (/glucose_readings).
    this.firebaseService.saveGlucoseReading(id, hours, glucose);
    this.formSuccess = `Reading saved for ${id}.`;

    // Reset just the numeric fields, keep the patient ID so the
    // clinician can log multiple readings for the same patient quickly.
    this.hoursInput = 0;
    this.glucoseInput = 0;
  }

 
  hoursArray: number[] = [];
glucoseArray: number[] = [];
  
  onPredictChange() {
    this.recomputePrediction();
  }

  onDegreeChange() {
    // selectedDegree is bound via [ngValue] so it is already a number.
    this.recomputePrediction();
  }

  private recomputePrediction() {
    if (this.predictX === null || this.predictX === undefined ||
        (this.predictX as any) === '' || isNaN(Number(this.predictX))) {
      this.predictedY = null;
      return;
    }
    const xs = this.hoursArray;
    const ys = this.glucoseArray;
    if (xs.length < this.selectedDegree + 1) {
      this.predictedY = null;
      return;
    }
    const coeffs = polynomialRegression(xs, ys, Number(this.selectedDegree));
    const y = evaluatePolynomial(coeffs, Number(this.predictX));
    this.predictedY = isFinite(y) ? Math.round(y * 100) / 100 : null;
  }
}
