import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { MLoginComponent } from '../../m-framework/components/m-login/m-login.component';

// Dedicated login screen for the Biomarker Monitoring app.
// Reuses the framework's <m-login> component, which validates credentials
// against a local user list. When the login is successful, we flip the
// `biomarker_auth` flag in localStorage and navigate into the protected
// /biomarker route. The biomarkerGuard reads that same flag.
@Component({
  selector: 'app-biomarker-login',
  standalone: true,
  imports: [MContainerComponent, MLoginComponent],
  templateUrl: './biomarker-login.component.html',
  styleUrl: './biomarker-login.component.css',
})
export class BiomarkerLoginComponent {
  constructor(private router: Router) {}

  onLoginSuccess() {
    localStorage.setItem('biomarker_auth', 'true');
    this.router.navigateByUrl('/biomarker');
  }
}
