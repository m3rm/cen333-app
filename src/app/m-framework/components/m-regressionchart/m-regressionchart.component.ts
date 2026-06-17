import { Component, Input, OnInit, OnChanges,
  AfterViewInit, SimpleChanges } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { polynomialRegression, evaluatePolynomial }
  from '../../../features/vitaltrend/regression.helper';

@Component({
  selector: 'm-regressionchart',
  standalone: true,
  imports: [],
  templateUrl: './m-regressionchart.component.html',
  styleUrl: './m-regressionchart.component.css'
})
export class MRegressionchartComponent
  implements OnInit, OnChanges, AfterViewInit {
    @Input() xData: number[] = [];
  @Input() yData: number[] = [];
  @Input() degree: number = 1;
  @Input() xLabel: string = 'X';
  @Input() yLabel: string = 'Y';

  // Optional prediction marker (used by GlucoTrack — passes a future X and the predicted Y).
  @Input() predictX: number | null = null;
  @Input() predictY: number | null = null;

  chartId: string = '';
  chart: any;

  // Step 1 of lifecycle: generate unique canvas ID
  ngOnInit() {
    this.chartId = 'reg-' +
      Math.random().toString(36).substring(2, 9);
  }

  // Step 2 of lifecycle: HTML is ready, create the chart
  ngAfterViewInit() {
    setTimeout(() => {
      this.initChart();
    }, 50);
  }

  // Step 3 of lifecycle: fires when xData, yData or degree change
  ngOnChanges(changes: SimpleChanges) {
    if (this.chart) {
      this.updateChart();
    }
  }

  initChart() {
    const canvas = document.getElementById(this.chartId) as HTMLCanvasElement;
    if (!canvas) return;

    this.chart = new Chart(canvas, {
      type: 'scatter',
      data: { datasets: [] },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { font: { size: 14 }, color: '#1A2B4A' }
          }
        },
        scales: {
          x: {
            title: {
              display: true, text: this.xLabel,
              font: { size: 14 }, color: '#334155'
            },
            ticks: { font: { size: 12 }, color: '#334155' },
            grid:  { color: '#E2E8F0' }
          },
          y: {
            title: {
              display: true, text: this.yLabel,
              font: { size: 14 }, color: '#334155'
            },
            ticks: { font: { size: 12 }, color: '#334155' },
            grid:  { color: '#E2E8F0' }
          }
        }
      }
    });

    this.updateChart();
  }
  updateChart() {
    if (!this.chart) return;

    const haveEnough = this.xData.length >= this.degree + 1;

    // Dataset 1 — scatter: raw data points (blue dots).
    const scatterData = this.xData.map((x, i) =>
      ({ x, y: this.yData[i] })
    );

    // Dataset 2 — regression curve (red line). Only when we have enough points.
    let curvePoints: { x: number; y: number }[] = [];
    if (haveEnough) {
      const coeffs = polynomialRegression(
        this.xData, this.yData, this.degree
      );
      const minX = Math.min(...this.xData);
      let maxX = Math.max(...this.xData);
      // Extend the curve out to the prediction X so the marker sits on the line.
      if (this.predictX !== null && this.predictX !== undefined) {
        maxX = Math.max(maxX, Number(this.predictX));
      }
      const step = (maxX - minX) / 100;
      if (step > 0) {
        for (let x = minX; x <= maxX; x += step) {
          curvePoints.push({
            x: Math.round(x * 10) / 10,
            y: Math.round(evaluatePolynomial(coeffs, x) * 100) / 100
          });
        }
      }
    }

    // Dataset 3 — prediction marker (amber diamond). Only when both predictX and predictY are set.
    const predictionData: { x: number; y: number }[] = [];
    if (
      this.predictX !== null && this.predictX !== undefined &&
      this.predictY !== null && this.predictY !== undefined
    ) {
      predictionData.push({
        x: Number(this.predictX),
        y: Number(this.predictY),
      });
    }

    this.chart.data.datasets = [
      {
        label: 'Patient Data',
        type: 'scatter',
        data: scatterData,
        backgroundColor: '#1565c0',
        pointRadius: 7,
        pointHoverRadius: 9
      },
      {
        label: `Degree ${this.degree} Fit`,
        type: 'line',
        data: curvePoints,
        borderColor: '#c62828',
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderWidth: 2.5,
        tension: 0.4
      },
      {
        label: 'Predicted Value',
        type: 'scatter',
        data: predictionData,
        backgroundColor: '#f9a825',
        borderColor: '#e65100',
        pointStyle: 'rectRot',
        pointRadius: 12,
        pointHoverRadius: 14,
        borderWidth: 3,
      },
    ];

    this.chart.update();
  }
}