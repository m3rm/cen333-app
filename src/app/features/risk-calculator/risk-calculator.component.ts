import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { MFormUlaComponent } from '../../m-framework/components/m-form-ula/m-form-ula.component';
import { MResultBoxComponent } from '../../m-framework/components/m-result-box/m-result-box.component';
import { MAhaComponent } from '../../m-framework/components/m-aha/m-aha.component';

@Component({
  selector: 'app-risk-calculator',
  standalone: true,
  imports: [MContainerComponent, MFormUlaComponent, FormsModule, MAhaComponent, MResultBoxComponent],
  templateUrl: './risk-calculator.component.html',
  styleUrl: './risk-calculator.component.css'
})
export class RiskCalculatorComponent {
  gender: string = 'Female';
  diabetes: boolean = false;
  crrt: boolean = false;
  wbc: number = 0;
  heartRate: number = 0;
  totalScore: number = 0;
  riskResult: string = '';
  calculated: boolean = false;

  calculate() {
    const genderPts = this.gender === 'Male' ? 20.7 : 0;
    const diabetesPts = this.diabetes ? 25.9 : 0;
    const crrtPts = this.crrt ? 19.8 : 0;
    const wbcPts = Math.min(100, 2.5 * (this.wbc / 1000));

    let hrPts: number;
    if (this.heartRate < 50) {
      hrPts = 0;
    } else if (this.heartRate <= 140) {
      hrPts = (0.6133 * this.heartRate) - 30.6667;
    } else {
      hrPts = 55.2;
    }

    const score = genderPts + diabetesPts + crrtPts + wbcPts + hrPts;
    this.totalScore = parseFloat(score.toFixed(2));

    if (score < 35.9) {
      this.riskResult = '< 1%';
    } else if (score <= 73.8) {
      this.riskResult = ((0.10554 * score) - 2.7889).toFixed(2) + '%';
    } else if (score <= 140.7) {
      this.riskResult = ((0.00592 * score * score) - (0.5856 * score) + 14.78).toFixed(2) + '%';
    } else {
      this.riskResult = '> 50%';
    }

    this.calculated = true;
  }

  getCondition(score: number): string {
    if (score < 35.9) return 'success';
    else if (score <= 73.8) return 'warning';
    else if (score <= 140.7) return 'warning';
    else return 'error';
  }
}