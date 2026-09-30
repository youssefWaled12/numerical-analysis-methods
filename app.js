function show(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

// Math parser to evaluate string expressions.
function evaluate(expr, x) {
  try {
    let formatted = expr.replace(/\s+/g, '')
      .replace(/(\d)(x)/g, '$1*$2')
      .replace(/(\d)\(/g, '$1*(')
      .replace(/\)(x)/g, ')*$1')
      .replace(/\)\(/g, ')*(')
      .replace(/(x)\(/g, '$1*(')
      .replace(/x\^(\d+)/g, "Math.pow(x,$1)")
      .replace(/\^/g, "**")
      .replace(/sin/g, "Math.sin")
      .replace(/cos/g, "Math.cos")
      .replace(/sqrt/g, "Math.sqrt")
      .replace(/exp/g, "Math.exp");
    return new Function('x', 'return ' + formatted)(x);
  } catch (e) {
    return NaN;
  }
}

function fmtCoeff(value) {
  return Number(value.toFixed(6)).toString();
}

function buildFixedPointGxFromFx(fxExpr) {
  const expression = (fxExpr || '').trim();
  if (!expression) return '';

  const c = evaluate(expression, 0);
  const v1 = evaluate(expression, 1);
  const v2 = evaluate(expression, 2);
  if ([c, v1, v2].some(v => Number.isNaN(v) || !Number.isFinite(v))) {
    return `x+(${expression})`;
  }

  // Estimate quadratic coefficients from 3 points:
  // f(x) = a*x^2 + b*x + c
  const a = (v2 - 2 * v1 + c) / 2;
  const b = v1 - c - a;
  if (Math.abs(a) < 1e-10) {
    return `x+(${expression})`;
  }

  // Rearrangement for fixed point:
  // a*x^2 + b*x + c = 0  =>  x^2 = (-b/a)*x + (-c/a)
  // Use rounded coefficients (1 d.p.) to match classroom truth tables.
  const k1 = Number(((-b / a)).toFixed(1));
  const k0 = Number(((-c / a)).toFixed(1));
  const k1Str = fmtCoeff(k1);
  const k0Str = fmtCoeff(k0);
  if (k0 >= 0) return `sqrt(${k1Str}*x+${k0Str})`;
  return `sqrt(${k1Str}*x${k0Str})`;
}

function display(containerId, root, rows, headers) {
  let html = `<div class="result-card"><b>Final Result:</b> Root ≈ ${Number(root).toFixed(3)}</div>`;
  html += `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(row => {
    html += `<tr>${row.map(val => `<td>${typeof val === 'number' ? val.toFixed(3) : val}</td>`).join('')}</tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById(containerId).innerHTML = html;
}

function runBisection() {
  let fx = document.getElementById('b-fx').value, xl = parseFloat(document.getElementById('b-xl').value),
    xu = parseFloat(document.getElementById('b-xu').value), tol = parseFloat(document.getElementById('b-tol').value);
  let rows = [], xr = 0, xrOld = 0, error = 100, i = 0;
  if (evaluate(fx, xl) * evaluate(fx, xu) >= 0) { alert("Check signs of xl and xu!"); return; }
  while (error > tol && i < 100) {
    const fxl = evaluate(fx, xl);
    const fxu = evaluate(fx, xu);
    xr = (xl + xu) / 2;
    const fxr = evaluate(fx, xr);
    if (i > 0) error = Math.abs((xr - xrOld) / xr) * 100;
    rows.push([i + 1, xl, fxl, xu, fxu, xr, fxr, i === 0 ? "---" : error]);
    if (fxl * fxr < 0) xu = xr; else xl = xr;
    xrOld = xr; i++;
  }
  display('b-out', xr, rows, ['i', 'xl', 'f(xl)', 'xu', 'f(xu)', 'xr', 'f(xr)', 'ε %']);
}

function runFalsePos() {
  let fx = document.getElementById('f-fx').value, xl = parseFloat(document.getElementById('f-xl').value),
    xu = parseFloat(document.getElementById('f-xu').value), tol = parseFloat(document.getElementById('f-tol').value);
  let rows = [], xr = 0, xrOld = 0, error = 100, i = 0;
  if (evaluate(fx, xl) * evaluate(fx, xu) >= 0) { alert("Check signs of xl and xu!"); return; }
  while (error > tol && i < 100) {
    const fxl = evaluate(fx, xl);
    const fxu = evaluate(fx, xu);
    // Match the classroom table style by using the rounded xr
    // shown in each row as the next iteration boundary.
    xr = Number((xu - (fxu * (xl - xu)) / (fxl - fxu)).toFixed(3));
    const fxr = evaluate(fx, xr);
    if (i > 0) error = Math.abs((xr - xrOld) / xr) * 100;
    rows.push([i + 1, xl, fxl, xu, fxu, xr, fxr, i === 0 ? "---" : error]);
    if (fxl * fxr < 0) xu = xr; else xl = xr;
    xrOld = xr; i++;
  }
  display('f-out', xr, rows, ['i', 'xl', 'f(xl)', 'xu', 'f(xu)', 'xr', 'f(xr)', 'ε %']);
}

function runNewton() {
  const fx = document.getElementById('n-fx').value;
  const dfx = document.getElementById('n-dfx').value;
  let xi = parseFloat(document.getElementById('n-x0').value);
  const tol = parseFloat(document.getElementById('n-tol').value);
  const rows = [];

  let fVal = evaluate(fx, xi);
  let dfVal = evaluate(dfx, xi);
  rows.push([0, xi, fVal, dfVal, '---']);

  let i = 1;
  while (i < 50) {
    const xiPrev = xi;
    xi = xiPrev - fVal / dfVal;
    const epsA = Math.abs((xi - xiPrev) / xi) * 100;
    fVal = evaluate(fx, xi);
    dfVal = evaluate(dfx, xi);
    rows.push([i, xi, fVal, dfVal, epsA]);
    if (epsA <= tol) break;
    i++;
  }

  display('n-out', xi, rows, ['i', 'x_i', 'f(x_i)', "f'(x_i)", 'ε_a %']);
}

function runFixedPoint() {
  const fx = document.getElementById('fp-fx').value;
  let gx = document.getElementById('fp-gx').value;
  if (!gx.trim()) {
    gx = buildFixedPointGxFromFx(fx);
    document.getElementById('fp-gx').value = gx;
  }
  if (!gx.trim()) {
    alert('Enter a valid f(x) to generate g(x).');
    return;
  }
  let xi = parseFloat(document.getElementById('fp-x0').value);
  const tol = parseFloat(document.getElementById('fp-tol').value);
  const rows = [];
  let xiPrev;
  let i = 0;

  while (i < 50) {
    const fXi = evaluate(gx, xi);
    const epsPct = i === 0 ? '---' : Math.abs((xi - xiPrev) / xi) * 100;
    rows.push([i, xi, fXi, epsPct]);
    if (i > 0 && epsPct <= tol) break;
    xiPrev = xi;
    xi = fXi;
    i++;
  }

  display('fp-out', xi, rows, ['i', 'x_i', 'F(x_i)', 'ε %']);
}

function runSecant() {
  let fx = document.getElementById('s-fx').value, xm1 = parseFloat(document.getElementById('s-xm1').value),
    x0 = parseFloat(document.getElementById('s-x0').value), tol = parseFloat(document.getElementById('s-tol').value);
  let rows = [], error = 100, i = 0;
  while (error > tol && i < 50) {
    let fm1 = evaluate(fx, xm1), f0 = evaluate(fx, x0);
    let xNext = x0 - (f0 * (xm1 - x0)) / (fm1 - f0);
    if (i > 0) error = Math.abs((x0 - xm1) / x0) * 100;
    rows.push([i, xm1, fm1, x0, f0, i === 0 ? "---" : error]);
    if (error <= tol && i > 0) break;
    xm1 = x0; x0 = xNext; i++;
  }
  display('s-out', x0, rows, ['I', 'xi-1', 'f(xi-1)', 'xi', 'f(xi)', 'Error %']);
}

function renderMatrixInputs(prefix) {
  const sizeElement = document.getElementById(`${prefix}-size`);
  const gridElement = document.getElementById(`${prefix}-grid`);
  if (!sizeElement || !gridElement) return;

  const n = parseInt(sizeElement.value, 10);
  gridElement.innerHTML = '';

  const matrixA = document.createElement('div');
  matrixA.className = 'matrix-a';
  matrixA.style.gridTemplateColumns = `repeat(${n}, 62px)`;

  const symbols1 = document.createElement('div');
  symbols1.className = 'matrix-symbols';

  const symbols2 = document.createElement('div');
  symbols2.className = 'matrix-symbols';

  const matrixB = document.createElement('div');
  matrixB.className = 'matrix-b';
  matrixB.style.gridTemplateColumns = '62px';

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.id = `${prefix}-a-${i}-${j}`;
      if (i === j) input.value = '1';
      matrixA.appendChild(input);
    }

    const xSymbol = document.createElement('span');
    xSymbol.className = 'matrix-symbol';
    xSymbol.textContent = `x${i + 1}`;
    symbols1.appendChild(xSymbol);

    const eqSymbol = document.createElement('span');
    eqSymbol.className = 'matrix-symbol';
    eqSymbol.textContent = i === Math.floor(n / 2) ? '=' : '';
    symbols2.appendChild(eqSymbol);

    const bInput = document.createElement('input');
    bInput.type = 'number';
    bInput.step = 'any';
    bInput.id = `${prefix}-b-${i}`;
    matrixB.appendChild(bInput);
  }

  gridElement.appendChild(matrixA);
  gridElement.appendChild(symbols1);
  gridElement.appendChild(symbols2);
  gridElement.appendChild(matrixB);
}

function parseAugmentedMatrix(prefix) {
  const sizeElement = document.getElementById(`${prefix}-size`);
  if (!sizeElement) throw new Error('Matrix size input not found.');

  const n = parseInt(sizeElement.value, 10);
  const matrix = [];

  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      const value = parseFloat(document.getElementById(`${prefix}-a-${i}-${j}`).value);
      if (Number.isNaN(value)) throw new Error(`Enter all matrix A values (row ${i + 1}, col ${j + 1}).`);
      row.push(value);
    }

    const bValue = parseFloat(document.getElementById(`${prefix}-b-${i}`).value);
    if (Number.isNaN(bValue)) throw new Error(`Enter all vector b values (row ${i + 1}).`);
    row.push(bValue);
    matrix.push(row);
  }

  return matrix;
}

function formatLinearResult(solution, title) {
  let html = `<div class="result-card"><b>${title}:</b><br/>`;
  solution.forEach((val, idx) => {
    html += `x${idx + 1} = ${val.toFixed(3)}<br/>`;
  });
  html += '</div>';
  return html;
}

function determinant(mat) {
  const n = mat.length;
  const a = mat.map(row => row.slice());
  let det = 1;

  for (let i = 0; i < n; i++) {
    let pivotRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(a[r][i]) > Math.abs(a[pivotRow][i])) pivotRow = r;
    }

    if (Math.abs(a[pivotRow][i]) < 1e-12) return 0;

    if (pivotRow !== i) {
      [a[i], a[pivotRow]] = [a[pivotRow], a[i]];
      det *= -1;
    }

    det *= a[i][i];
    for (let r = i + 1; r < n; r++) {
      const factor = a[r][i] / a[i][i];
      for (let c = i; c < n; c++) {
        a[r][c] -= factor * a[i][c];
      }
    }
  }

  return det;
}

function gaussianElimination(matrix) {
  const n = matrix.length;

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }

    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

    if (Math.abs(matrix[i][i]) < 1e-12) {
      throw new Error('No unique solution');
    }

    for (let k = i + 1; k < n; k++) {
      const factor = matrix[k][i] / matrix[i][i];
      for (let j = i; j <= n; j++) {
        matrix[k][j] -= factor * matrix[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = matrix[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= matrix[i][j] * x[j];
    }
    x[i] /= matrix[i][i];
  }

  return x;
}

function runGaussianElimination() {
  try {
    const matrix = parseAugmentedMatrix('ge').map(row => row.slice());
    const solution = gaussianElimination(matrix);
    document.getElementById('ge-out').innerHTML = formatLinearResult(solution, 'Gaussian Elimination Result');
  } catch (err) {
    alert(err.message);
  }
}

function runGaussJordan() {
  try {
    const m = parseAugmentedMatrix('gj').map(row => row.slice());
    const n = m.length;

    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(m[r][i]) > Math.abs(m[pivotRow][i])) pivotRow = r;
      }
      if (Math.abs(m[pivotRow][i]) < 1e-12) throw new Error('Matrix is singular or has no unique solution.');
      if (pivotRow !== i) [m[i], m[pivotRow]] = [m[pivotRow], m[i]];

      const pivot = m[i][i];
      for (let c = i; c <= n; c++) m[i][c] /= pivot;

      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const factor = m[r][i];
        for (let c = i; c <= n; c++) {
          m[r][c] -= factor * m[i][c];
        }
      }
    }

    const solution = m.map(row => row[n]);
    document.getElementById('gj-out').innerHTML = formatLinearResult(solution, 'Gauss Jordan Result');
  } catch (err) {
    alert(err.message);
  }
}

function runLUDecomposition() {
  try {
    const aug = parseAugmentedMatrix('lu');
    const n = aug.length;
    const a = aug.map(row => row.slice(0, n));
    const b = aug.map(row => row[n]);
    const l = Array.from({ length: n }, () => Array(n).fill(0));
    const u = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) l[i][i] = 1;

    for (let i = 0; i < n; i++) {
      for (let k = i; k < n; k++) {
        let sum = 0;
        for (let j = 0; j < i; j++) sum += l[i][j] * u[j][k];
        u[i][k] = a[i][k] - sum;
      }

      if (Math.abs(u[i][i]) < 1e-12) throw new Error('LU failed: zero pivot (matrix may be singular).');

      for (let k = i + 1; k < n; k++) {
        let sum = 0;
        for (let j = 0; j < i; j++) sum += l[k][j] * u[j][i];
        l[k][i] = (a[k][i] - sum) / u[i][i];
      }
    }

    const y = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < i; j++) sum += l[i][j] * y[j];
      y[i] = b[i] - sum;
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += u[i][j] * x[j];
      x[i] = (y[i] - sum) / u[i][i];
    }

    document.getElementById('lu-out').innerHTML = formatLinearResult(x, 'LU Decomposition Result');
  } catch (err) {
    alert(err.message);
  }
}

function runCramerRule() {
  try {
    const aug = parseAugmentedMatrix('cr');
    const n = aug.length;
    const a = aug.map(row => row.slice(0, n));
    const b = aug.map(row => row[n]);
    const detA = determinant(a);
    if (Math.abs(detA) < 1e-12) throw new Error('Cramer rule is not valid because det(A) = 0.');

    const solution = [];
    for (let i = 0; i < n; i++) {
      const ai = a.map((row, r) => row.map((val, c) => (c === i ? b[r] : val)));
      solution.push(determinant(ai) / detA);
    }

    document.getElementById('cr-out').innerHTML = formatLinearResult(solution, 'Cramer Rule Result');
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ['ge', 'gj', 'lu', 'cr'].forEach(renderMatrixInputs);

  const fxInput = document.getElementById('fp-fx');
  const gxInput = document.getElementById('fp-gx');
  if (fxInput && gxInput) {
    const syncGx = () => {
      gxInput.value = buildFixedPointGxFromFx(fxInput.value);
    };
    fxInput.addEventListener('input', syncGx);
    syncGx();
  }
});