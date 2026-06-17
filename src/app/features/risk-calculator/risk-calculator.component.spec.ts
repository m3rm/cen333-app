import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RiskCalculatorComponent } from './risk-calculator.component';

describe('RiskCalculatorComponent', () => {
  let component: RiskCalculatorComponent;
  let fixture: ComponentFixture<RiskCalculatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskCalculatorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RiskCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
