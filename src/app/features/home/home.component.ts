import { Component } from '@angular/core';
import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, MContainerComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  // One card per app. `path` matches the entries in app.routes.ts.
  apps = [
    { label: 'Power Plant',     path: '/powerplant',     desc: 'Monitor turbine readings.' },
    { label: 'CropGuard',       path: '/cropguardlogin', desc: 'Login-protected crop dashboard.' },
    { label: 'Biomarker',       path: '/biomarkerlogin', desc: 'Login-protected biomarker monitor.' },
    { label: 'Risk Calculator', path: '/riskcalculator', desc: 'Cardiovascular risk score.' },
    { label: 'Vital Trend',     path: '/vitaltrend',     desc: 'Heart-rate regression and prediction.' },
    { label: 'GlucoTrack',      path: '/glucotrack',     desc: 'Glucose regression and prediction.' },
    { label: 'Heritage Map',    path: '/heritagemap',    desc: 'Cultural sites on Google Maps + Gemini.' },
    { label: 'QuickDispatch',   path: '/quickdispatch',  desc: 'Delivery map + Gemini courier notes.' },
    { label: 'SchematicScan',   path: '/schematicscan',  desc: 'Camera/upload circuit + Gemini solver.' },
    { label: 'PillSnap',        path: '/pillsnap',       desc: 'Identify pills, track doses, see 7-day intake.' },
  ];

  constructor(public router: Router){}
}