import { Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
@Injectable({
  providedIn: 'root'
})
export class GeminiService {


  private endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  async generateText(prompt: string): Promise<string>{

    const url = this.endpoint + '?key=' + environment.geminiApiKey;

    const body = {
      contents:[{
        parts: [{text: prompt}]
      }]
    };

    const response = await fetch(url, {
      method:'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    }
    );

    const data = await response.json();
    console.log(data);
    const text = data.candidates[0].content.parts[0].text;
    return text || '(no response)';

  }

  // App 4 (QuickDispatch): builds a structured courier prompt then reuses generateText.
  async generateInstruction(
    customerName: string,
    weight: number,
    priority: string,
    distanceKm: number,
  ): Promise<string> {
    const prompt = `
You are a logistics dispatcher assistant for an app called QuickDispatch.
Write a 2-sentence courier-style instruction for the following delivery.
Be concise, practical, and direct.

Customer: ${customerName}
Package weight: ${weight} kg
Priority: ${priority}
Distance from warehouse: ${distanceKm.toFixed(2)} km

Reply with only the two-sentence instruction, no preamble.
    `.trim();
    return this.generateText(prompt);
  }

  // App 5 (SchematicScan): multimodal request — image part + text prompt, forced JSON output.
  async analyzeImage(
    prompt: string,
    base64Image: string,
    mimeType: string,
  ): Promise<string> {
    const url = this.endpoint + '?key=' + environment.geminiApiKey;

    const body = {
      contents: [{
        parts: [
          // App 5: inlineData carries the image (image part comes first by best practice).
          { inlineData: { mimeType: mimeType, data: base64Image } },
          { text: prompt }
        ]
      }],
      // App 5: responseMimeType forces Gemini to return parseable JSON (no markdown fences).
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('Gemini analyzeImage raw response:', data);

    // HTTP-level failure (400, 403, 429, 500…).
    if (!response.ok || data.error) {
      const msg = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      throw new Error('Gemini API error: ' + msg);
    }

    // Safety / policy block — no candidates returned, just a promptFeedback.
    if (!data.candidates || data.candidates.length === 0) {
      const reason = data?.promptFeedback?.blockReason || 'unknown';
      throw new Error('Gemini blocked the response (reason: ' + reason + ').');
    }

    const candidate = data.candidates[0];

    // Per-candidate safety block: finishReason can be SAFETY, RECITATION, etc.
    if (candidate.finishReason && candidate.finishReason !== 'STOP' && !candidate.content) {
      throw new Error('Gemini stopped early (reason: ' + candidate.finishReason + ').');
    }

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned no text in the response.');
    }
    return text;
  }
}
