import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { PowerPlantComponent } from './features/power-plant/power-plant.component';
import { CropguardComponent } from './features/cropguard/cropguard.component';
import { CropguardLoginComponent } from './features/cropguard-login/cropguard-login.component';
import { authGuard } from './guards/auth.guard';
import { biomarkerGuard } from './guards/biomarker.guard';
import { VitaltrendComponent } from './features/vitaltrend/vitaltrend.component';
import { HeritagemapComponent } from './features/heritagemap/heritagemap.component';
import { BiomarkerComponent } from './features/biomarker/biomarker.component';
import { BiomarkerLoginComponent } from './features/biomarker-login/biomarker-login.component';
import { GlucotrackComponent } from './features/glucotrack/glucotrack.component';
import { QuickdispatchComponent } from './features/quickdispatch/quickdispatch.component';
import { RiskCalculatorComponent } from './features/risk-calculator/risk-calculator.component';
import { SchematicscanComponent } from './features/schematicscan/schematicscan.component';
import { PillsnapComponent } from './features/pillsnap/pillsnap.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'powerplant', component: PowerPlantComponent },
    { path: 'cropguard', component: CropguardComponent, canActivate: [authGuard] },
    { path: 'cropguardlogin', component: CropguardLoginComponent },
    { path: 'biomarker', component: BiomarkerComponent, canActivate: [biomarkerGuard] },
    { path: 'biomarkerlogin', component: BiomarkerLoginComponent },
    { path: 'vitaltrend', component: VitaltrendComponent },
    { path: 'heritagemap', component: HeritagemapComponent },
    { path: 'glucotrack', component: GlucotrackComponent },
    { path: 'quickdispatch', component: QuickdispatchComponent },
    { path: 'riskcalculator', component: RiskCalculatorComponent },
    { path: 'schematicscan', component: SchematicscanComponent },
    { path: 'pillsnap', component: PillsnapComponent },
    { path: '**', redirectTo: '' }
];
