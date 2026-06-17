import { inject } from '@angular/core';
import { Router } from '@angular/router';

// Route guard for the Biomarker Monitoring app.
// Reads the `biomarker_auth` flag that the login component sets in
// localStorage. If the flag is not 'true', the user is redirected to the
// login page.
export const biomarkerGuard = () => {
  const auth = localStorage.getItem('biomarker_auth');
  if (auth === 'true') {
    return true;
  }
  return inject(Router).createUrlTree(['/biomarkerlogin']);
};
