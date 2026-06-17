import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MContainerComponent } from
  '../../m-framework/components/m-container/m-container.component';
import { GeminiService } from '../../services/gemini.service';

// App 5: the JSON contract Gemini must follow when it answers about the schematic.
interface CircuitAnalysis {
  circuitType: string;                                 // 'series' | 'parallel' | 'mixed'
  source: { type: string; value: number; unit: string };
  components: {
    id: string;
    type: string;
    value: number;
    unit: string;
  }[];
  totals: {
    totalResistance: number;                           // ohm
    totalCurrent: number;                              // A
    totalPower: number;                                // W
  };
  voltageDrops: { id: string; voltage: number }[];
  explanation: string;
  confidence: string;                                  // 'high' | 'medium' | 'low'
}

@Component({
  selector: 'app-schematicscan',
  standalone: true,
  imports: [CommonModule, FormsModule, MContainerComponent],
  templateUrl: './schematicscan.component.html',
  styleUrl: './schematicscan.component.css',
})
export class SchematicscanComponent implements OnInit {

  // App 5: @ViewChild + #video/#canvas template refs bridge HTML and TS.
  @ViewChild('video') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Shared image state (filled by either the camera path or the file-upload path).
  imagePreview: string = '';   // full data URL — feeds the <img> preview
  imageBase64: string = '';    // payload only (after the comma) — feeds Gemini
  imageMimeType: string = '';  // 'image/jpeg' or 'image/png'

  // App 5: live camera state.
  stream: MediaStream | null = null;
  isCameraOn: boolean = false;

  // Analysis state.
  isAnalyzing: boolean = false;
  result: CircuitAnalysis | null = null;
  errorMessage: string = '';

  // App 5: localStorage history (App 2 pattern).
  history: { thumb: string; result: CircuitAnalysis }[] = [];

  // App 5: structured prompt — names every field, types, and the calculation rules.
  prompt = `You are an electrical circuit analyst. The image shows a circuit schematic. Analyze it and return a single JSON object that matches exactly this shape:
{
  "circuitType": "series" | "parallel" | "mixed",
  "source": { "type": "DC" | "AC", "value": number, "unit": "V" },
  "components": [
    { "id": "R1", "type": "resistor", "value": number, "unit": "ohm" }
  ],
  "totals": {
    "totalResistance": number,
    "totalCurrent": number,
    "totalPower": number
  },
  "voltageDrops": [
    { "id": "R1", "voltage": number }
  ],
  "explanation": "2 to 4 sentences explaining the solution steps",
  "confidence": "high" | "medium" | "low"
}

Rules:
- All resistances in ohms, currents in amperes, voltages in volts, power in watts
- Use Ohm's law and Kirchhoff's voltage law to compute totals
- If a value is unreadable, set confidence to "low" and best-guess the value
- Return ONLY the JSON object, no extra text`;

  constructor(private geminiService: GeminiService) {}

  // App 5: load saved scans on page open.
  ngOnInit() {
    const saved = localStorage.getItem('schematicscan_history');
    if (saved) {
      this.history = JSON.parse(saved);
    }
  }

  // ===== App 5: file upload path =====
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.imageMimeType = file.type;

    // App 5: FileReader.readAsDataURL → "data:image/jpeg;base64,/9j/4AAQ..."
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.imagePreview = dataUrl;
      this.imageBase64 = dataUrl.split(',')[1];     // strip the prefix, keep payload
      console.log('MIME type:', this.imageMimeType);
      console.log('Base64 length:', this.imageBase64.length);
    };
    reader.readAsDataURL(file);
  }

  // ===== App 5: live camera path =====
  async startCamera() {
    try {
      // App 5: navigator.mediaDevices.getUserMedia opens the camera stream.
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }     // rear camera on phones, webcam on laptops
      });
      this.videoElement.nativeElement.srcObject = this.stream;
      this.isCameraOn = true;
    } catch (err) {
      alert('Could not access the camera: ' + err);
    }
  }

  stopCamera() {
    // App 5: stop every track so the camera light turns off.
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isCameraOn = false;
  }

  capturePhoto() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    // App 5: copy current video frame onto the hidden <canvas>, then export as a data URL.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.imagePreview = dataUrl;
    this.imageBase64 = dataUrl.split(',')[1];
    this.imageMimeType = 'image/jpeg';

    this.stopCamera();
  }

  // ===== App 5: multimodal Gemini call + parse JSON =====
  async analyzeSchematic() {
    if (!this.imageBase64) {
      alert('Please capture an image first');
      return;
    }

    this.isAnalyzing = true;
    this.result = null;
    this.errorMessage = '';

    try {
      const reply = await this.geminiService.analyzeImage(
        this.prompt,
        this.imageBase64,
        this.imageMimeType,
      );
      console.log('Raw Gemini reply:', reply);
      // App 5: JSON.parse is safe because responseMimeType forced pure JSON output.
      this.result = JSON.parse(reply) as CircuitAnalysis;
      this.saveToHistory();
    } catch (err) {
      this.errorMessage = 'Could not analyze the schematic. Try a clearer photo.';
      console.error(err);
    }

    this.isAnalyzing = false;
  }

  // App 5: persist every successful analysis to localStorage.
  saveToHistory() {
    if (!this.result) return;
    this.history.unshift({
      thumb: this.imagePreview,
      result: this.result,
    });
    localStorage.setItem(
      'schematicscan_history',
      JSON.stringify(this.history),
    );
  }

  clearHistory() {
    this.history = [];
    localStorage.removeItem('schematicscan_history');
  }
}
