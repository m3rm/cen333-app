import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MContainerComponent } from
  '../../m-framework/components/m-container/m-container.component';
import { MSearchButtonComponent } from
  '../../m-framework/components/m-search-button/m-search-button.component';
import { MTimeseriesChartComponent } from
  '../../m-framework/components/m-timeserieschart/m-timeserieschart.component';

import { FirebaseService } from '../../services/firebase.service';
import { GeminiService } from '../../services/gemini.service';
import { Medication, Dose } from './medication.model';

@Component({
  selector: 'app-pillsnap',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MContainerComponent, MSearchButtonComponent, MTimeseriesChartComponent,
  ],
  templateUrl: './pillsnap.component.html',
  styleUrl: './pillsnap.component.css',
})
export class PillsnapComponent implements OnInit {

  // App 5 (lab) carry-over: ViewChild for the camera + canvas elements.
  @ViewChild('video') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasElement!: ElementRef<HTMLCanvasElement>;

  // ===== image state =====
  imagePreview: string = '';
  imageBase64: string = '';
  imageMimeType: string = '';

  // ===== camera state =====
  stream: MediaStream | null = null;
  isCameraOn: boolean = false;

  // ===== Gemini analysis state =====
  isAnalyzing: boolean = false;
  analysisError: string = '';
  pending: Omit<Medication, 'id' | 'thumb' | 'createdAt'> | null = null;
  nicknameInput: string = '';

  // ===== cloud-synced state =====
  medications: Medication[] = [];
  doses: Dose[] = [];

  // ===== library + history filters =====
  libraryFilter: string = '';
  historyFilter: string = '';

  // ===== dose form state =====
  doseMedicationId: string = '';
  doseTakenAt: string = this.nowIsoLocal();
  doseNotes: string = '';
  doseError: string = '';
  doseSuccess: string = '';

  // ===== expanded-card state (View Details) =====
  expandedId: string | null = null;

  // Assignment 5: structured prompt for Gemini Vision medication ID.
  // Phrased to discourage safety refusals: explicit educational use, allow guessing,
  // require JSON in all cases.
  prompt = `This is an educational app for a Cross-Platform Mobile Application
Development course. You are helping a student demonstrate multimodal AI.
The output is shown with a disclaimer that this is NOT medical advice.

Look at the image (it shows a pill, tablet, capsule, or medication blister pack)
and reply with general public-knowledge information about the likely medication.
Treat it like an educational identification exercise — best guess is fine.

You MUST return ONLY a single JSON object with this exact shape, no preamble,
no markdown fences:
{
  "name": "string",
  "activeIngredient": "string",
  "dosage": "string",
  "uses": ["short phrase", "short phrase", "short phrase"],
  "warnings": ["short phrase", "short phrase", "short phrase"],
  "confidence": "high" | "medium" | "low"
}

Rules:
- 2 to 3 short entries in "uses" and "warnings"
- "dosage" = typical adult dose with units (e.g. "500 mg every 6 hours")
- If the image is unclear or the pill is unmarked, fill every field with your
  best guess and set "confidence" to "low" — do NOT refuse
- If the image is not a medication at all, still return the JSON shape with
  name "Unknown" and confidence "low"
- Return ONLY the JSON object, nothing else`;

  constructor(
    private firebaseService: FirebaseService,
    private geminiService: GeminiService,
  ) {}

  // Demo: ngOnInit subscribes to both Firebase collections so the UI updates live across devices.
  ngOnInit() {
    this.firebaseService.getMedications((data) => this.medications = data as Medication[]);
    this.firebaseService.getDoses((data) => this.doses = data as Dose[]);
  }

  // ============= CAMERA + UPLOAD (App 5 lab pattern) =============

  // Demo: file-upload path — FileReader turns the file into a base64 data URL.
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.imageMimeType = file.type;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.imagePreview = dataUrl;
      this.imageBase64 = dataUrl.split(',')[1];
    };
    reader.readAsDataURL(file);
  }

  // Demo: live camera path — getUserMedia opens the webcam, facingMode prefers the rear camera on phones.
  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.videoElement.nativeElement.srcObject = this.stream;
      this.isCameraOn = true;
    } catch (err) {
      alert('Could not access the camera: ' + err);
    }
  }

  // Demo: stops every track so the camera light turns off when we're done.
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.isCameraOn = false;
  }

  // Demo: draws the current video frame onto a hidden canvas and exports it as a base64 image.
  capturePhoto() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.imagePreview = dataUrl;
    this.imageBase64 = dataUrl.split(',')[1];
    this.imageMimeType = 'image/jpeg';
    this.stopCamera();
  }

  // ============= GEMINI VISION =============

  // Demo: sends the image to Gemini Vision, strips any markdown fences, parses the JSON answer.
  async analyzeMedication() {
    if (!this.imageBase64) {
      this.analysisError = 'Please capture or upload a photo first.';
      return;
    }
    this.isAnalyzing = true;
    this.analysisError = '';
    this.pending = null;

    try {
      const reply = await this.geminiService.analyzeImage(
        this.prompt, this.imageBase64, this.imageMimeType,
      );
      console.log('Gemini medication reply:', reply);

      // Handle the case where Gemini ignored responseMimeType and wrapped the
      // JSON in markdown fences (```json ... ```).
      let cleaned = reply.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);

      // Assignment 5: warn on low confidence but still let the user save.
      if (parsed.confidence === 'low') {
        this.analysisError =
          'Gemini was not confident about this pill. You can take a clearer photo or save anyway with a manual nickname.';
      }
      this.pending = parsed;
    } catch (err: any) {
      console.error('analyzeMedication failed:', err);
      // Show the actual reason so we can tell a safety block from a parse error.
      const msg = err?.message || String(err);
      this.analysisError = 'Could not analyze: ' + msg + '. Try a clearer photo or a different angle.';
    }
    this.isAnalyzing = false;
  }

  // Demo: pushes the Gemini result, nickname, and thumbnail to Firebase /medications.
  saveToLibrary() {
    if (!this.pending) return;
    const entry: Omit<Medication, 'id'> = {
      ...this.pending,
      nickname: (this.nicknameInput || '').trim(),
      thumb: this.imagePreview,
    } as Omit<Medication, 'id'>;
    this.firebaseService.saveMedication(entry);

    // Reset the camera/analysis area, ready for the next pill.
    this.pending = null;
    this.nicknameInput = '';
    this.imagePreview = '';
    this.imageBase64 = '';
    this.imageMimeType = '';
  }

  // ============= LIBRARY =============

  // Demo: filters the library by name, nickname, or active ingredient.
  get filteredMedications(): Medication[] {
    const term = this.libraryFilter.toLowerCase();
    if (!term) return this.medications;
    return this.medications.filter(m =>
      (m.name || '').toLowerCase().includes(term) ||
      (m.nickname || '').toLowerCase().includes(term) ||
      (m.activeIngredient || '').toLowerCase().includes(term)
    );
  }

  // Demo: counts how many doses reference this medication — used on the card.
  countDosesFor(medId: string): number {
    return this.doses.filter(d => d.medicationId === medId).length;
  }

  toggleExpanded(medId: string) {
    this.expandedId = this.expandedId === medId ? null : medId;
  }

  // Demo: Log Dose button pre-selects this medication and scrolls to the form.
  prefillDoseFromCard(med: Medication) {
    this.doseMedicationId = med.id || '';
    this.doseTakenAt = this.nowIsoLocal();
    this.doseNotes = '';
    this.doseError = '';
    this.doseSuccess = '';
    // Scroll to the form so the user sees it.
    setTimeout(() => {
      document.getElementById('dose-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }

  // ============= DOSE LOG =============

  // Demo: validates the dose entry — no future date, no more than 30 days past — then pushes to Firebase.
  logDose() {
    this.doseError = '';
    this.doseSuccess = '';

    if (!this.doseMedicationId) {
      this.doseError = 'Pick a medication first.';
      return;
    }
    const taken = new Date(this.doseTakenAt);
    if (isNaN(taken.getTime())) {
      this.doseError = 'Date/time is invalid.';
      return;
    }
    const now = Date.now();
    if (taken.getTime() > now) {
      this.doseError = 'Date/time cannot be in the future.';
      return;
    }
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    if (taken.getTime() < thirtyDaysAgo) {
      this.doseError = 'Date/time cannot be more than 30 days in the past.';
      return;
    }

    const med = this.medications.find(m => m.id === this.doseMedicationId);
    if (!med) { this.doseError = 'Medication no longer exists.'; return; }

    this.firebaseService.saveDose({
      medicationId: med.id,
      medicationName: med.nickname || med.name,
      takenAt: taken.toISOString(),
      notes: (this.doseNotes || '').trim(),
    });

    this.doseSuccess = `Dose logged for ${med.nickname || med.name}.`;
    this.doseNotes = '';
    this.doseTakenAt = this.nowIsoLocal();
  }

  // ============= HISTORY =============

  // Demo: sorts doses newest-first and filters by medication name.
  get sortedDoses(): Dose[] {
    const term = this.historyFilter.toLowerCase();
    const filtered = !term
      ? this.doses
      : this.doses.filter(d => (d.medicationName || '').toLowerCase().includes(term));
    return [...filtered].sort((a, b) =>
      new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
    );
  }

  // Demo: returns the ID of the most recently logged dose — the table uses this to highlight the row.
  get latestDoseId(): string | null {
    if (this.doses.length === 0) return null;
    const latest = [...this.doses].sort((a, b) => (b.loggedAt || 0) - (a.loggedAt || 0))[0];
    return latest.id || null;
  }

  thumbFor(medId: string): string {
    const med = this.medications.find(m => m.id === medId);
    return med?.thumb || '';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  }

  // ============= 7-DAY CHART =============

  // Demo: walks back 7 days from today and counts doses per day — feeds the m-timeserieschart.
  get last7Days(): { date: string; value: number }[] {
    const buckets: { date: string; value: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const label = `${day.getMonth() + 1}/${day.getDate()}`;
      const start = day.getTime();
      const end = start + 24 * 60 * 60 * 1000;

      const count = this.doses.filter(d => {
        const t = new Date(d.takenAt).getTime();
        return t >= start && t < end;
      }).length;

      buckets.push({ date: label, value: count });
    }
    return buckets;
  }

  // ============= helpers =============

  // Returns "YYYY-MM-DDTHH:mm" in local time, suitable for <input type="datetime-local">.
  private nowIsoLocal(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
