/* ═══════════════════════════════════════════════
   VSENS — script.js
   - Theme toggle
   - Scroll reveal
   - Layer expand/collapse
   - PID simulation canvas
   - Vacuum gauge simulation
   - Data flow animated packets
   - Terminal log animation
   - Test plot canvases
   ═══════════════════════════════════════════════ */

/* ════════════════════════════════
   THEME TOGGLE
════════════════════════════════ */
const themeBtn = document.getElementById('theme-toggle');
const html = document.documentElement;

function setTheme(t) {
  html.setAttribute('data-theme', t);
  localStorage.setItem('vsens-theme', t);
}

themeBtn?.addEventListener('click', () => {
  setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

const savedTheme = localStorage.getItem('vsens-theme') || 'dark';
setTheme(savedTheme);

/* ════════════════════════════════
   NAVBAR SCROLL STYLE
════════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.borderBottomColor = window.scrollY > 10
    ? 'var(--border-bright)'
    : 'var(--border)';
}, { passive: true });

/* ════════════════════════════════
   SCROLL REVEAL
════════════════════════════════ */
const revealEls = document.querySelectorAll('.reveal, .reveal-child');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      const delay = e.target.classList.contains('reveal-child')
        ? Array.from(e.target.parentElement.querySelectorAll('.reveal-child')).indexOf(e.target) * 80
        : 0;
      setTimeout(() => e.target.classList.add('visible'), delay);
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

revealEls.forEach(el => observer.observe(el));

/* ════════════════════════════════
   LAYER TOGGLE
════════════════════════════════ */
function toggleLayer(header) {
  const layer = header.closest('.arch-layer');
  layer.classList.toggle('open');
}

// Open first layer by default
document.querySelector('.arch-layer')?.classList.add('open');

/* ════════════════════════════════
   PID SIMULATION
════════════════════════════════ */
(function () {
  const canvas = document.getElementById('pid-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let Kp = 1.5, Ki = 0.3, Kd = 0.1, setpoint = 77;
  const N = 200;

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr) || 480;
    canvas.height = Math.floor(220 * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '220px';
    ctx.scale(dpr, dpr);
  }

  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); drawPID(); });

  function simulatePID(kp, ki, kd, sp) {
    const dt = 0.5;
    let temp = 20; // ambient start
    let integral = 0, prevError = 0;
    const tempHistory = [temp];
    const maxPwr = 100;

    for (let i = 1; i < N; i++) {
      const error = sp - temp;
      integral += error * dt;
      integral = Math.max(-500, Math.min(500, integral));
      const derivative = (error - prevError) / dt;
      prevError = error;
      let power = kp * error + ki * integral + kd * derivative;
      power = Math.max(0, Math.min(maxPwr, power));
      // First-order thermal model
      const targetIncrease = power * 0.6;
      temp += (targetIncrease - (temp - 20) * 0.12) * dt * 0.1;
      tempHistory.push(temp);
    }
    return tempHistory;
  }

  function drawPID() {
    const W = parseFloat(canvas.style.width) || 480;
    const H = 220;

    ctx.clearRect(0, 0, W, H);

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const bg = isDark ? '#080c10' : '#f0f4f8';
    const gridColor = isDark ? '#1e3048' : '#c0d0e0';
    const textColor = isDark ? '#5a7898' : '#4a6a8a';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const pad = { t: 16, r: 12, b: 32, l: 44 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;

    const temps = simulatePID(Kp, Ki, Kd, setpoint);
    const minT = Math.min(15, ...temps);
    const maxT = Math.max(setpoint + 10, ...temps);
    const tRange = maxT - minT || 1;

    const xScale = chartW / (N - 1);
    const yScale = chartH / tRange;

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (chartH / 4) * i;
      ctx.beginPath();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 4]);
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      const val = maxT - (tRange / 4) * i;
      ctx.fillStyle = textColor;
      ctx.font = '9px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(0) + 'K', pad.l - 4, y + 3);
    }

    // X axis labels
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const x = pad.l + (chartW / 4) * i;
      ctx.fillText((N / 4 * i * 0.5).toFixed(0) + 's', x, H - 8);
    }

    // Setpoint line
    const spY = pad.t + chartH - (setpoint - minT) * yScale;
    ctx.beginPath();
    ctx.strokeStyle = isDark ? '#00ff9d' : '#007a4a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.moveTo(pad.l, spY);
    ctx.lineTo(pad.l + chartW, spY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Temperature curve
    ctx.beginPath();
    ctx.strokeStyle = isDark ? '#00c8ff' : '#0070c0';
    ctx.lineWidth = 2;
    ctx.shadowColor = isDark ? '#00c8ff' : '#0070c0';
    ctx.shadowBlur = 4;
    temps.forEach((t, i) => {
      const x = pad.l + i * xScale;
      const y = pad.t + chartH - (t - minT) * yScale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawPID();

  function bindSlider(id, valId, prop, decimals) {
    const el = document.getElementById(id);
    const display = document.getElementById(valId);
    el?.addEventListener('input', () => {
      const v = parseFloat(el.value);
      if (prop === 'Kp') Kp = v;
      else if (prop === 'Ki') Ki = v;
      else if (prop === 'Kd') Kd = v;
      else if (prop === 'sp') setpoint = v;
      display.textContent = v.toFixed(decimals);
      drawPID();
    });
  }

  bindSlider('kp', 'kp-val', 'Kp', 1);
  bindSlider('ki', 'ki-val', 'Ki', 2);
  bindSlider('kd', 'kd-val', 'Kd', 2);
  bindSlider('sp', 'sp-val', 'sp', 0);
})();

/* ════════════════════════════════
   VACUUM GAUGE SIMULATION
════════════════════════════════ */
(function () {
  const arc = document.getElementById('gauge-arc');
  const expText = document.getElementById('gauge-exp');
  const stateText = document.getElementById('gauge-state');
  const vacCanvas = document.getElementById('vac-canvas');
  if (!vacCanvas) return;
  const ctx = vacCanvas.getContext('2d');

  const history = Array(120).fill(1.2);
  let base = 1.2; // mantissa of x10^-4

  const CIRCUMFERENCE = 2 * Math.PI * 80;

  function vacToFraction(mantissa) {
    // 0.5 = very good, 1.0 = nominal, 5.0 = warning edge, 10.0 = critical
    return Math.min(1, Math.log10(mantissa + 0.5) / Math.log10(10.5));
  }

  function updateGauge(mantissa) {
    const pct = vacToFraction(mantissa);
    const offset = CIRCUMFERENCE * (1 - pct);
    arc.setAttribute('stroke-dashoffset', offset.toFixed(1));

    expText.textContent = mantissa.toFixed(2);

    if (mantissa < 1) {
      arc.setAttribute('stroke', 'var(--ok)');
      stateText.setAttribute('fill', 'var(--ok)');
      stateText.textContent = 'NOMINAL';
    } else if (mantissa < 5) {
      arc.setAttribute('stroke', 'var(--accent)');
      stateText.setAttribute('fill', 'var(--accent)');
      stateText.textContent = 'NOMINAL';
    } else if (mantissa < 9) {
      arc.setAttribute('stroke', 'var(--warn)');
      stateText.setAttribute('fill', 'var(--warn)');
      stateText.textContent = 'WARNING';
    } else {
      arc.setAttribute('stroke', 'var(--crit)');
      stateText.setAttribute('fill', 'var(--crit)');
      stateText.textContent = 'CRITICAL';
    }
  }

  function drawHistory() {
    const W = vacCanvas.width, H = vacCanvas.height;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#080c10' : '#f0f4f8';
    ctx.fillRect(0, 0, W, H);

    const grid = isDark ? '#1e3048' : '#c0d0e0';
    for (let i = 0; i <= 3; i++) {
      const y = (H / 3) * i;
      ctx.beginPath();
      ctx.strokeStyle = grid;
      ctx.lineWidth = 0.5;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }

    const max = Math.max(...history) * 1.2;
    const min = 0;

    ctx.beginPath();
    ctx.strokeStyle = isDark ? '#00c8ff' : '#0070c0';
    ctx.lineWidth = 1.5;
    history.forEach((v, i) => {
      const x = (i / history.length) * W;
      const y = H - ((v - min) / (max - min)) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under
    ctx.beginPath();
    history.forEach((v, i) => {
      const x = (i / history.length) * W;
      const y = H - ((v - min) / (max - min)) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = isDark ? 'rgba(0,200,255,0.06)' : 'rgba(0,112,192,0.06)';
    ctx.fill();
  }

  function tickVacuum() {
    base += (Math.random() - 0.5) * 0.15;
    base = Math.max(0.5, Math.min(9.5, base));
    history.push(base);
    history.shift();
    updateGauge(base);
    drawHistory();
    document.getElementById('t-vacuum').textContent = (base * 1e-4).toExponential(1);
  }

  updateGauge(base);
  drawHistory();
  setInterval(tickVacuum, 1200);
})();

/* ════════════════════════════════
   LIVE TELEMETRY (hero strip)
════════════════════════════════ */
(function () {
  let temp = 77.3;
  let heater = 34;

  setInterval(() => {
    temp += (Math.random() - 0.5) * 0.08;
    temp = Math.max(76.8, Math.min(77.8, temp));
    heater += (Math.random() - 0.5) * 2;
    heater = Math.max(20, Math.min(60, heater));

    const tEl = document.getElementById('t-temp');
    const hEl = document.getElementById('t-heater');
    if (tEl) tEl.textContent = temp.toFixed(1);
    if (hEl) hEl.textContent = Math.round(heater);
  }, 1500);
})();

/* ════════════════════════════════
   ANIMATED DATA PACKETS — Data Flow
════════════════════════════════ */
(function () {
  const svg = document.getElementById('flow-svg');
  if (!svg) return;

  // Add SVG defs for arrowheads
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="farrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="var(--accent)"/>
    </marker>
    <marker id="farrow-feedback" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="var(--accent3)"/>
    </marker>
  `;
  svg.prepend(defs);

  const paths = [
    { id: 'fp0', delay: 0 },
    { id: 'fp1', delay: 600 },
    { id: 'fp2', delay: 1200 },
    { id: 'fp3', delay: 1800 },
  ];

  paths.forEach(({ id, delay }, idx) => {
    const path = document.getElementById(id);
    const pkt = document.getElementById('pkt' + idx);
    if (!path || !pkt) return;

    function animate(startTime) {
      const duration = 1400;

      function step(now) {
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Manual interpolation since we can't use animateMotion dynamically
        const len = path.getTotalLength();
        const pt = path.getPointAtLength(t * len);
        pkt.setAttribute('cx', pt.x);
        pkt.setAttribute('cy', pt.y);
        pkt.setAttribute('opacity', t > 0.02 && t < 0.98 ? '1' : '0');

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          pkt.setAttribute('opacity', '0');
          setTimeout(() => animate(null), 400);
        }
      }

      setTimeout(() => requestAnimationFrame(step), delay);
    }

    setTimeout(() => animate(null), delay);
  });
})();

/* ════════════════════════════════
   TERMINAL LOGGER
════════════════════════════════ */
(function () {
  const body = document.getElementById('term-body');
  if (!body) return;

  const messages = [
    ['DATA', 'P={v0} Torr, T={v1} K, PWM={v2}%'],
    ['DATA', 'PID output: e={v3}, u={v4}'],
    ['INFO', 'Watchdog heartbeat OK'],
    ['DATA', 'Cloud sync: 12 records pushed'],
    ['INFO', 'Vacuum threshold check PASS'],
    ['DATA', 'T_setpoint=77.0K, T_actual={v1}K, delta={v5}mK'],
    ['INFO', 'Heater state: ACTIVE'],
    ['DATA', 'ADC sample 0x{v6}: raw={v7}'],
  ];

  function fmt(template) {
    const p = (1 + (Math.random() - 0.5) * 0.3) * 1.24e-4;
    const t = 77.0 + (Math.random() - 0.5) * 0.4;
    const pwm = Math.round(30 + Math.random() * 15);
    const e = ((Math.random() - 0.5) * 0.8).toFixed(3);
    const u = (Math.random() * 0.5).toFixed(3);
    const delta = Math.round(Math.random() * 120);
    const adc = Math.floor(Math.random() * 3).toString(16).padStart(2, '0');
    const raw = Math.floor(2000 + Math.random() * 500);
    return template
      .replace('{v0}', p.toExponential(2))
      .replace('{v1}', t.toFixed(2))
      .replace('{v2}', pwm)
      .replace('{v3}', e)
      .replace('{v4}', u)
      .replace('{v5}', delta)
      .replace('{v6}', adc)
      .replace('{v7}', raw);
  }

  function now() {
    const d = new Date();
    return d.toISOString().replace('T', ' ').substring(0, 23);
  }

  function addLine() {
    const [tag, msg] = messages[Math.floor(Math.random() * messages.length)];
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = `<span class="term-ts">${now()}</span> <span class="term-tag ${tag.toLowerCase()}">${tag}</span>  ${fmt(msg)}`;
    body.appendChild(line);
    if (body.children.length > 40) body.removeChild(body.firstChild);
    body.scrollTop = body.scrollHeight;
  }

  setInterval(addLine, 1800);
})();

/* ════════════════════════════════
   TEST PLOTS
════════════════════════════════ */
function drawSimplePlot(canvasId, dataFn, color, yLabel) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function draw() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.floor((rect.width - 48) * dpr) || 320;
    const H = 160 * dpr;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = (W / dpr) + 'px';
    canvas.style.height = '160px';
    ctx.scale(dpr, dpr);

    const Wl = W / dpr, Hl = H / dpr;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const bg = isDark ? '#080c10' : '#f0f4f8';
    const grid = isDark ? '#1e3048' : '#c0d0e0';
    const tcol = isDark ? '#3a5878' : '#7a9ab8';

    ctx.fillStyle = bg; ctx.fillRect(0, 0, Wl, Hl);

    const data = dataFn();
    const pad = { t: 12, r: 8, b: 28, l: 36 };
    const cW = Wl - pad.l - pad.r;
    const cH = Hl - pad.t - pad.b;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // grid
    for (let i = 0; i <= 3; i++) {
      const y = pad.t + (cH / 3) * i;
      ctx.beginPath();
      ctx.strokeStyle = grid;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 4]);
      ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y);
      ctx.stroke();
      ctx.setLineDash([]);
      const v = max - (range / 3) * i;
      ctx.fillStyle = tcol;
      ctx.font = '8px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(2), pad.l - 3, y + 3);
    }

    // x-axis
    ctx.fillStyle = tcol;
    ctx.textAlign = 'center';
    ctx.font = '8px IBM Plex Mono, monospace';
    for (let i = 0; i <= 3; i++) {
      const x = pad.l + (cW / 3) * i;
      ctx.fillText(Math.round((data.length / 3) * i) + 's', x, Hl - 8);
    }

    // line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color; ctx.shadowBlur = 3;
    data.forEach((v, i) => {
      const x = pad.l + (i / (data.length - 1)) * cW;
      const y = pad.t + cH - ((v - min) / range) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  draw();
}

// Temp stability — stays near 77K with tiny noise
function genStabilityData() {
  const d = [];
  let t = 20;
  for (let i = 0; i < 200; i++) {
    // rise + stabilize
    if (i < 80) t += (77 - t) * 0.08 + (Math.random() - 0.5) * 0.4;
    else t += (Math.random() - 0.5) * 0.06;
    d.push(t);
  }
  return d;
}

// Vacuum drift — slowly decreasing pressure (improving)
function genVacDriftData() {
  const d = [];
  let p = 5.0;
  for (let i = 0; i < 240; i++) {
    p -= 0.008 + Math.random() * 0.005;
    p = Math.max(0.3, p);
    p += (Math.random() - 0.5) * 0.05;
    d.push(p);
  }
  return d;
}

// Step response
function genStepData() {
  const d = [];
  let t = 77;
  const newSP = 87;
  for (let i = 0; i < 200; i++) {
    if (i < 20) d.push(t);
    else {
      const err = newSP - t;
      t += err * 0.06 + (Math.random() - 0.5) * 0.15;
      d.push(t);
    }
  }
  return d;
}

// Draw after a short delay to let DOM settle
setTimeout(() => {
  drawSimplePlot('stab-canvas', genStabilityData, '#00c8ff', 'K');
  drawSimplePlot('vac-drift-canvas', genVacDriftData, '#00ff9d', '×10⁻⁴');
  drawSimplePlot('step-canvas', genStepData, '#ff6b35', 'K');
}, 300);

window.addEventListener('resize', () => {
  drawSimplePlot('stab-canvas', genStabilityData, '#00c8ff', 'K');
  drawSimplePlot('vac-drift-canvas', genVacDriftData, '#00ff9d', '×10⁻⁴');
  drawSimplePlot('step-canvas', genStepData, '#ff6b35', 'K');
});

/* expose layer toggle globally */
window.toggleLayer = function(header) {
  const layer = header.closest('.arch-layer');
  layer.classList.toggle('open');
};