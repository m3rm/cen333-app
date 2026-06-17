

// Returns the polynomial coefficients [a0, a1, a2, ...]
export function polynomialRegression(
  xData: number[],
  yData: number[],
  degree: number
): number[] {
  const n = degree + 1;
  const N = xData.length;

  // Build the normal equations matrix X and vector Y.
  // X[i][j] = sum of x^(i+j),  Y[i] = sum of x^i * y.
  const X: number[][] = [];
  const Y: number[] = [];

  for (let i = 0; i < n; i++) {
    X.push([]);
    Y.push(0);
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < N; k++) {
        sum += Math.pow(xData[k], i + j);
      }
      X[i].push(sum);
    }
    for (let k = 0; k < N; k++) {
      Y[i] += Math.pow(xData[k], i) * yData[k];
    }
  }

  // Gaussian elimination with partial pivoting.
  
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(X[k][i]) > Math.abs(X[maxRow][i])) {
        maxRow = k;
      }
    }
    [X[i], X[maxRow]] = [X[maxRow], X[i]];
    [Y[i], Y[maxRow]] = [Y[maxRow], Y[i]];

    for (let k = i + 1; k < n; k++) {
      const factor = X[k][i] / X[i][i];
      for (let j = i; j < n; j++) {
        X[k][j] -= factor * X[i][j];
      }
      Y[k] -= factor * Y[i];
    }
  }

  // Back substitution: the system is now upper-triangular, so we solve
  // from the bottom row up. Each row has only one new unknown.
  const coeffs = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    coeffs[i] = Y[i] / X[i][i];
    for (let k = i - 1; k >= 0; k--) {
      Y[k] -= X[k][i] * coeffs[i];
    }
  }

  return coeffs;
}

// Evaluate the polynomial at a given x value:
// y = a0 + a1*x + a2*x^2 + ... + an*x^n
export function evaluatePolynomial(coeffs: number[], x: number): number {
  return coeffs.reduce(
    (sum, c, i) => sum + c * Math.pow(x, i),
    0
  );
}
