import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { MMainMenuComponent } from '../../m-framework/components/m-main-menu/m-main-menu.component';
import { MTimeseriesChartComponent } from '../../m-framework/components/m-timeserieschart/m-timeserieschart.component';
import { MResultBoxComponent } from '../../m-framework/components/m-result-box/m-result-box.component';
import { MTableComponent } from '../../m-framework/components/m-table/m-table.component';
import { MSearchButtonComponent } from '../../m-framework/components/m-search-button/m-search-button.component';

// Shape of a single lab-record entry that the app stores in localStorage.
interface BiomarkerReading {
  patientName: string;
  testDate: string; // yyyy-mm-dd
  ldl: number;      // mg/dL
  tsh: number;      // mIU/L
  crp: number;      // mg/L
}

// Classification returned by the getXxxStatus helpers below.
// The `type` maps 1:1 to the <m-result-box> color classes.
interface BiomarkerStatus {
  type: 'success' | 'warning' | 'error';
  header: string;
  message: string;
}

@Component({
  selector: 'app-biomarker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MContainerComponent,
    MMainMenuComponent,
    MTimeseriesChartComponent,
    MResultBoxComponent,
    MTableComponent,
    MSearchButtonComponent,
  ],
  templateUrl: './biomarker.component.html',
  styleUrl: './biomarker.component.css',
})
export class BiomarkerComponent {
  // Which sub-page is currently visible. Driven by the <m-main-menu>.
  activeSection: string = 'Log Reading';

  // --- Form state (template-driven via [(ngModel)]) ---
  patientName: string = '';
  testDate: string = '';
  ldlValue: number | null = null;
  tshValue: number | null = null;
  crpValue: number | null = null;

  // Feedback shown under the form.
  validationError: string = '';
  formSuccess: string = '';

  // Every reading ever logged, ordered oldest -> newest by test date.
  readings: BiomarkerReading[] = [];

  // Bound directly to <m-table>'s filterTerm via the <m-search-button>.
  filterTerm: string = '';

  // Column configuration passed to <m-table>.
  tableHeaders: string[] = [
    'Patient',
    'Date',
    'LDL (mg/dL)',
    'TSH (mIU/L)',
    'CRP (mg/L)',
  ];
  columnsToBeDisplayed: string[] = [
    'patientName',
    'testDate',
    'ldl',
    'tsh',
    'crp',
  ];

  // LocalStorage key for all readings.
  private static readonly STORAGE_KEY = 'biomarker_readings';

  constructor(private router: Router) {
    // READ from localStorage -- convert back from string with JSON.parse
    const stored = localStorage.getItem(BiomarkerComponent.STORAGE_KEY);
    this.readings = stored ? JSON.parse(stored) : [];
  }

  // ---------- Menu navigation ----------
  onMenuClick(item: any) {
    this.activeSection = item;
    // Clear transient form feedback when the user navigates away.
    if (item !== 'Log Reading') {
      this.validationError = '';
      this.formSuccess = '';
    }
  }

  // ---------- Input validation ----------
  
  // sets validationError on the first failed check and returns false.
  // saveReading() calls it and bails out early if invalid.
  isValid(): boolean {
    if (!this.patientName || !this.patientName.trim()) {
      this.validationError = 'Patient name is required.';
      return false;
    }
    if (!this.testDate) {
      this.validationError = 'Please select a test date.';
      return false;
    }
    if (this.ldlValue === null || isNaN(Number(this.ldlValue)) ||
        this.ldlValue < 0 || this.ldlValue > 300) {
      this.validationError = 'LDL must be between 0 and 300 mg/dL.';
      return false;
    }
    if (this.tshValue === null || isNaN(Number(this.tshValue)) ||
        this.tshValue < 0 || this.tshValue > 20) {
      this.validationError = 'TSH must be between 0 and 20 mIU/L.';
      return false;
    }
    if (this.crpValue === null || isNaN(Number(this.crpValue)) ||
        this.crpValue < 0 || this.crpValue > 200) {
      this.validationError = 'CRP must be between 0 and 200 mg/L.';
      return false;
    }
    this.validationError = '';
    return true;
  }

  // ---------- Form submission ----------
  saveReading() {
    this.formSuccess = '';
    if (!this.isValid()) return; // stop if invalid

    const entry: BiomarkerReading = {
      patientName: this.patientName.trim(),
      testDate: this.testDate,
      ldl: Number(this.ldlValue),
      tsh: Number(this.tshValue),
      crp: Number(this.crpValue),
    };

    // push -- adds to array
    this.readings.push(entry);

    // sort by date chronologically (oldest -> newest)
    this.readings.sort((a, b) =>
      new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
    );


    this.readings = [...this.readings];

    // SAVE to localStorage -- convert to string first with JSON.stringify
    localStorage.setItem(
      BiomarkerComponent.STORAGE_KEY,
      JSON.stringify(this.readings)
    );

    this.formSuccess = 'Reading saved successfully.';

    // Reset the form so the clinician can log the next patient fast.
    this.patientName = '';
    this.testDate = '';
    this.ldlValue = null;
    this.tshValue = null;
    this.crpValue = null;
  }

  // ---------- Chart data getters ----------

  get ldlReadings(): { date: string; value: number }[] {
    return this.readings.map(r => ({ date: r.testDate, value: r.ldl }));
  }
  get tshReadings(): { date: string; value: number }[] {
    return this.readings.map(r => ({ date: r.testDate, value: r.tsh }));
  }
  get crpReadings(): { date: string; value: number }[] {
    return this.readings.map(r => ({ date: r.testDate, value: r.crp }));
  }

  // Most recent (latest dated) entry, used by the Alerts tab.
  
  get latestReading(): BiomarkerReading | undefined {
    return [...this.readings]
      .reverse()
      .find(r => r !== undefined);
  }

 
  // Used in the Alerts tab to show every reading that was flagged warning
  // or error for any of the three biomarkers.
  get abnormalReadings(): BiomarkerReading[] {
    return this.readings.filter(r =>
      this.getLdlStatus(r.ldl).type !== 'success' ||
      this.getTshStatus(r.tsh).type !== 'success' ||
      this.getCrpStatus(r.crp).type !== 'success'
    );
  }

  // ---------- Threshold logic ----------
 
  getLdlStatus(value: number): BiomarkerStatus {
    if (value <= 100) {
      return { type: 'success', header: 'Optimal', message: `LDL is optimal at ${value} mg/dL.` };
    }
    if (value <= 159) {
      return { type: 'warning', header: 'Borderline', message: `LDL is borderline high at ${value} mg/dL.` };
    }
    return { type: 'error', header: 'High', message: `LDL is high at ${value} mg/dL.` };
  }

  getTshStatus(value: number): BiomarkerStatus {
    if (value >= 0.4 && value <= 4.0) {
      return { type: 'success', header: 'Normal', message: `TSH is normal at ${value} mIU/L.` };
    }
    if (value < 0.4) {
      return { type: 'warning', header: 'Low (Hyperthyroidism risk)', message: `TSH is low at ${value} mIU/L.` };
    }
    return { type: 'error', header: 'High (Hypothyroidism risk)', message: `TSH is high at ${value} mIU/L.` };
  }

  getCrpStatus(value: number): BiomarkerStatus {
    if (value < 1.0) {
      return { type: 'success', header: 'Low Risk', message: `CRP is low at ${value} mg/L.` };
    }
    if (value <= 3.0) {
      return { type: 'warning', header: 'Average Risk', message: `CRP is at ${value} mg/L.` };
    }
    return { type: 'error', header: 'High Risk', message: `CRP is high at ${value} mg/L.` };
  }

  // ---------- Logout ----------
  // Clears the auth flag and bounces back to the login screen; the guard
  // will then block any attempt to revisit /biomarker directly.
  logout() {
    localStorage.removeItem('biomarker_auth');
    this.router.navigateByUrl('/biomarkerlogin');
  }
}
