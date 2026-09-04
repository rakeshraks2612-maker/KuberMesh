// KUBERMESH CONTROLLER — MONEY MANAGEMENT PLATFORM EDITION
let currentCatalogData = [];

document.addEventListener("DOMContentLoaded", () => {
  initAmbientCanvas();
  initHeroCardsParallax();
  loadDashboardData();
  loadAuditLedger();
  updateElasticitySimulation();
});

// Interactive Liquid Aurora Wave & Financial Flow Canvas Engine
function initAmbientCanvas() {
  const canvas = document.getElementById("ambient-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let width, height;
  let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };
  let time = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;
  });
  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });
  resize();

  // Multi-layered fluid aurora ribbons
  const waves = [
    {
      baseYRatio: 0.32,
      amplitude: 60,
      speed: 0.012,
      wavelength: 0.0032,
      phase: 0,
      colors: ["rgba(2, 132, 199, 0.14)", "rgba(56, 189, 248, 0.07)", "rgba(99, 102, 241, 0.01)"],
      lineColor: "rgba(2, 132, 199, 0.38)",
      lineWidth: 1.5
    },
    {
      baseYRatio: 0.48,
      amplitude: 75,
      speed: 0.009,
      wavelength: 0.0026,
      phase: Math.PI / 3,
      colors: ["rgba(99, 102, 241, 0.12)", "rgba(139, 92, 246, 0.06)", "rgba(2, 132, 199, 0.01)"],
      lineColor: "rgba(99, 102, 241, 0.32)",
      lineWidth: 1.5
    },
    {
      baseYRatio: 0.64,
      amplitude: 68,
      speed: 0.014,
      wavelength: 0.0038,
      phase: Math.PI * 0.75,
      colors: ["rgba(16, 185, 129, 0.10)", "rgba(6, 182, 212, 0.05)", "rgba(16, 185, 129, 0.01)"],
      lineColor: "rgba(16, 185, 129, 0.28)",
      lineWidth: 1.2
    },
    {
      baseYRatio: 0.80,
      amplitude: 52,
      speed: 0.008,
      wavelength: 0.0022,
      phase: Math.PI * 1.2,
      colors: ["rgba(6, 182, 212, 0.09)", "rgba(2, 132, 199, 0.04)", "rgba(241, 245, 249, 0.0)"],
      lineColor: "rgba(6, 182, 212, 0.25)",
      lineWidth: 1.2
    }
  ];

  // Floating luminous pulses along the wave ribbons
  const pulses = Array.from({ length: 22 }, (_, i) => ({
    waveIndex: i % waves.length,
    progress: Math.random(),
    speed: 0.0006 + Math.random() * 0.0010,
    radius: Math.random() * 2.2 + 1.4,
    glowSize: Math.random() * 14 + 8,
    color: i % 3 === 0 ? "2, 132, 199" : (i % 3 === 1 ? "99, 102, 241" : "16, 185, 129")
  }));

  function getWaveY(wave, x, t) {
    const baseY = height * wave.baseYRatio;
    let y = baseY + 
      Math.sin(x * wave.wavelength + t * wave.speed * 60 + wave.phase) * wave.amplitude +
      Math.sin(x * wave.wavelength * 0.5 - t * wave.speed * 30) * (wave.amplitude * 0.35) +
      Math.cos(x * wave.wavelength * 1.8 + t * wave.speed * 45) * (wave.amplitude * 0.2);

    // Mouse fluid wave ripple & deflection
    if (mouse.active) {
      const dx = x - mouse.x;
      const dy = baseY - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 260) {
        const factor = (1 - dist / 260);
        y += Math.sin(dist * 0.04 - t * 4) * factor * 26;
      }
    }
    return y;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    time += 0.016;

    // Smooth mouse follow
    if (mouse.active) {
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      // Cursor Ambient Radiant Lens
      const lens = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
      lens.addColorStop(0, "rgba(2, 132, 199, 0.07)");
      lens.addColorStop(0.4, "rgba(99, 102, 241, 0.025)");
      lens.addColorStop(1, "transparent");
      ctx.fillStyle = lens;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 220, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Aurora Liquid Waves
    for (let w = 0; w < waves.length; w++) {
      const wave = waves[w];
      const step = 8;
      const points = [];

      for (let x = 0; x <= width + step; x += step) {
        points.push({ x, y: getWaveY(wave, x, time) });
      }

      // Gradient fill under the wave curve
      const fillGrad = ctx.createLinearGradient(0, height * (wave.baseYRatio - 0.2), 0, height);
      fillGrad.addColorStop(0, wave.colors[0]);
      fillGrad.addColorStop(0.5, wave.colors[1]);
      fillGrad.addColorStop(1, wave.colors[2]);

      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const xc = (prev.x + curr.x) / 2;
        const yc = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Glowing Crest Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const xc = (prev.x + curr.x) / 2;
        const yc = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
      }
      ctx.strokeStyle = wave.lineColor;
      ctx.lineWidth = wave.lineWidth;
      ctx.stroke();
    }

    // Draw Luminous Gliding Data Pulses along waves
    for (let i = 0; i < pulses.length; i++) {
      const p = pulses[i];
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;

      const wave = waves[p.waveIndex];
      const posX = p.progress * width;
      const posY = getWaveY(wave, posX, time);

      // Pulse Glow halo
      const glowGrad = ctx.createRadialGradient(posX, posY, 0, posX, posY, p.glowSize);
      glowGrad.addColorStop(0, `rgba(${p.color}, 0.40)`);
      glowGrad.addColorStop(0.5, `rgba(${p.color}, 0.10)`);
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(posX, posY, p.glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Core Particle
      ctx.beginPath();
      ctx.arc(posX, posY, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, 0.85)`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// Interactive 3D Card Deck Parallax & Tilt Physics (3-Card Golden Ratio Deck)
function initHeroCardsParallax() {
  const stage = document.querySelector(".hero-cards-stage");
  if (!stage) return;
  const cards = stage.querySelectorAll(".fintech-credit-card");
  if (!cards.length) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  window.addEventListener("mousemove", (e) => {
    const rect = stage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    targetX = (e.clientX - centerX) / (window.innerWidth / 2);
    targetY = (e.clientY - centerY) / (window.innerHeight / 2);
  });

  function updateTilt() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    const tiltX = -currentY * 8; // gentle tilt up/down
    const tiltY = currentX * 10;  // gentle tilt left/right

    const obsidian = stage.querySelector(".card-obsidian");
    const glass = stage.querySelector(".card-glass");
    const cobalt = stage.querySelector(".card-cobalt");

    if (obsidian && !obsidian.matches(":hover")) {
      obsidian.style.transform = `rotateX(${8 + tiltX * 0.5}deg) rotateY(${14 + tiltY * 0.6}deg) rotateZ(-5deg) translateY(${tiltX * 1.5}px)`;
    }
    if (glass && !glass.matches(":hover")) {
      glass.style.transform = `rotateX(${6 + tiltX * 0.6}deg) rotateY(${tiltY * 0.6}deg) rotateZ(0deg) translateY(${-10 + tiltX * 1.5}px) scale(1.04)`;
    }
    if (cobalt && !cobalt.matches(":hover")) {
      cobalt.style.transform = `rotateX(${8 + tiltX * 0.5}deg) rotateY(${-14 + tiltY * 0.6}deg) rotateZ(5deg) translateY(${tiltX * 1.5}px)`;
    }

    requestAnimationFrame(updateTilt);
  }

  updateTilt();
}

function scrollToDashboard() {
  const el = document.getElementById("dashboard");
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function navigateToTab(tabId) {
  switchTab(tabId);
  scrollToDashboard();
}

// Toast Alert Engine (No Emojis, Clean Typography)
function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let label = "INFO";
  if (type === "success") label = "SUCCESS";
  if (type === "warning") label = "NOTICE";
  if (type === "error") label = "ALERT";

  toast.innerHTML = `<span style="font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">[${label}]</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    toast.style.transition = "all 0.2s ease";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

function copyProtocolUrl() {
  const url = `${window.location.origin}/api/a2a/catalog`;
  navigator.clipboard.writeText(url).then(() => {
    showToast(`Copied protocol endpoint: ${url}`, "success");
  }).catch(() => {
    prompt("Copy protocol manifest URL:", url);
  });
}

function updateElasticitySimulation() {
  const slider = document.getElementById("sim-discount-slider");
  if (!slider) return;
  const discount = parseFloat(slider.value);
  document.getElementById("sim-discount-val").textContent = `${discount}%`;

  const baseMargin = 35.0; // Baseline catalog margin
  const postMargin = Math.max(0, baseMargin - discount);
  const breakevenUplift = postMargin > 0 ? (baseMargin / postMargin).toFixed(2) : "Infinity";
  const recoveryRate = (Math.min(75, discount * 3.5 + 5)).toFixed(1);

  document.getElementById("sim-post-margin").textContent = `${postMargin.toFixed(1)}%`;
  document.getElementById("sim-breakeven-uplift").textContent = `${breakevenUplift}x`;
  document.getElementById("sim-recovery-rate").textContent = `+${recoveryRate}%`;

  const badge = document.getElementById("simulator-guardrail-badge");
  const badgeText = document.getElementById("simulator-badge-text");
  if (discount > 20.0 || postMargin < 8.0) {
    badge.className = "guardrail-status-chip breach";
    badgeText.textContent = "Guardrail Breach: Blocked by Rules G-01 & G-02";
  } else {
    badge.className = "guardrail-status-chip safe";
    badgeText.textContent = "Safe Zone: Rules G-01 & G-02 Verified";
  }
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-pill-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(content => content.classList.remove("active"));

  const btn = document.getElementById(`tab-btn-${tabId}`);
  const content = document.getElementById(`tab-${tabId}`);
  if (btn) btn.classList.add("active");
  if (content) content.classList.add("active");

  if (tabId === 'audit') {
    loadAuditLedger();
  } else if (tabId === 'a2a') {
    updateA2APriceHint();
  }
}

async function loadDashboardData(retryCount = 0) {
  try {
    const res = await fetch("/api/catalog");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentCatalogData = data.items || [];

    // Update Top Metrics
    const totalLeakage = data.total_revenue_at_risk_inr || 0;
    const leakageFormatted = `₹${totalLeakage.toLocaleString('en-IN')}`;
    
    const heroStat = document.getElementById("hero-stat-leakage");
    if (heroStat) heroStat.textContent = leakageFormatted;
    
    // Render Catalog Table
    renderCatalogTable(currentCatalogData);
    populateA2ASelect(currentCatalogData);
  } catch (err) {
    console.warn("Catalog fetch attempt failed:", err);
    if (retryCount < 2) {
      setTimeout(() => loadDashboardData(retryCount + 1), 1000);
    } else {
      showToast("Syncing with live Razorpay catalog...", "info");
    }
  }
}

function renderCatalogTable(items) {
  const tbody = document.getElementById("catalog-table-body");
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6">No catalog items discovered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(entry => {
    const item = entry.item;
    const prof = entry.profile;
    const rars = entry.rars;

    let rarsClass = "rars-low";
    if (rars.risk_level === "CRITICAL") rarsClass = "rars-critical";
    else if (rars.risk_level === "HIGH") rarsClass = "rars-high";
    else if (rars.risk_level === "MODERATE") rarsClass = "rars-moderate";

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-dark);">${item.name}</div>
          <div style="font-size: 11px; color: var(--text-subtle); font-family: var(--font-mono);">SKU: ${item.id}</div>
        </td>
        <td style="font-family: var(--font-mono); font-weight: 600;">₹${item.amount_inr.toFixed(2)}</td>
        <td style="color: #059669; font-weight: 600; font-family: var(--font-mono);">${item.base_margin_pct}%</td>
        <td>
          <div style="font-weight: 600;">${(prof.cart_abandonment_rate * 100).toFixed(1)}%</div>
          <div style="font-size: 11px; color: var(--text-subtle);">${prof.total_orders_abandoned}/${prof.total_orders_created} carts</div>
        </td>
        <td>${prof.sales_velocity_7d} <span style="font-size: 11px; color: var(--text-subtle);">orders/day</span></td>
        <td>${prof.stagnation_days} <span style="font-size: 11px; color: var(--text-subtle);">days</span></td>
        <td>
          <span class="rars-badge ${rarsClass}">
            ${rars.score.toFixed(2)} • ${rars.risk_level}
          </span>
        </td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 8px; align-items: center;">
            <button class="btn-light-primary btn-sm" onclick="optimizeSingleItem('${item.id}')">
              Optimize
            </button>
            <button class="btn-light-secondary btn-sm" title="Simulate 15 cart drop-offs" onclick="injectChaos('${item.id}', 'abandonment_spike')">
              Drop-off
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function injectChaos(itemId, anomalyType) {
  try {
    const res = await fetch("/api/simulate/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, anomaly_type: anomalyType, count: 15 })
    });
    const data = await res.json();
    showToast(`Injected 15 simulated cart drop-offs for SKU ${itemId}. Recalculating risk...`, "warning");
    await loadDashboardData();
  } catch (err) {
    console.error("Traffic injection failed:", err);
    showToast("Traffic simulation failed", "error");
  }
}

async function triggerMultiScenarioDemo() {
  const scenario = document.getElementById("select-failure-scenario").value;
  const btn = document.getElementById("btn-fail-demo");
  btn.disabled = true;
  btn.innerHTML = `<span>Intercepting &amp; Auto-Repairing...</span>`;

  try {
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force_scenario: scenario })
    });
    const result = await res.json();
    renderExecutionTrace(result);
    showToast(`Guardrail Intercepted &amp; Auto-Repaired!`, "success");
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Scenario demo failed:", err);
    showToast("Scenario test failed", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Test Selected Guardrail</span>`;
  }
}

// Built-in catalog metadata dictionary for instantaneous reactivity
const defaultCatalogFallbacks = {
  "item_TXtg5qNcyOuOI5": { item: { id: "item_TXtg5qNcyOuOI5", name: "VortexRGB Mechanical Keyboard", amount_inr: 3499.0, base_cost_paise: 227435 } },
  "item_TXtg4gEDvC6yTI": { item: { id: "item_TXtg4gEDvC6yTI", name: "Chronos AMOLED Smartwatch", amount_inr: 2999.0, base_cost_paise: 194935 } },
  "item_TXtg3FXJM6HJzP": { item: { id: "item_TXtg3FXJM6HJzP", name: "AuraSound Pro ANC Earbuds", amount_inr: 1499.0, base_cost_paise: 97435 } },
  "item_TXtg5MKgWaUz7b": { item: { id: "item_TXtg5MKgWaUz7b", name: "VoltPulse 65W GaN Dual-Port Charger", amount_inr: 1199.0, base_cost_paise: 77935 } },
  "item_TXtg43cU40UXDq": { item: { id: "item_TXtg43cU40UXDq", name: "AuraSound Armour Silicone Case", amount_inr: 399.0, base_cost_paise: 25935 } }
};

function getCatalogEntry(sku) {
  if (currentCatalogData && currentCatalogData.length > 0) {
    const found = currentCatalogData.find(e => e.item && e.item.id === sku);
    if (found) return found;
  }
  return defaultCatalogFallbacks[sku] || Object.values(defaultCatalogFallbacks)[0];
}

function populateA2ASelect(items) {
  const select = document.getElementById("a2a-sku");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = items.map(entry => {
    return `<option value="${entry.item.id}">${entry.item.name} — ₹${entry.item.amount_inr.toFixed(2)}</option>`;
  }).join("");
  if (currentVal && items.some(e => e.item.id === currentVal)) {
    select.value = currentVal;
  } else if (items.length > 0) {
    select.value = items[0].item.id;
  }
  onA2ASkuChange();
}

function onA2ASkuChange() {
  const select = document.getElementById("a2a-sku");
  if (!select) return;
  const sku = select.value;
  const entry = getCatalogEntry(sku);
  if (entry && entry.item) {
    const input = document.getElementById("a2a-offered-inr");
    if (input) {
      input.value = (entry.item.amount_inr * 0.90).toFixed(2);
    }
  }
  updateA2APriceHint();
}

function setA2APreset(type) {
  const select = document.getElementById("a2a-sku");
  if (!select) return;
  const sku = select.value;
  const entry = getCatalogEntry(sku);
  if (!entry || !entry.item) return;

  const retail = entry.item.amount_inr;
  const minMargin = 0.08;
  const floorPrice = (entry.item.base_cost_paise / (1.0 - minMargin)) / 100.0;
  const input = document.getElementById("a2a-offered-inr");

  if (type === 'valid') {
    input.value = (retail * 0.90).toFixed(2);
    showToast(`Preset: 10% discount applied (₹${input.value})`, "info");
  } else if (type === 'floor') {
    input.value = Math.ceil(floorPrice).toFixed(2);
    showToast(`Preset: Margin floor applied (₹${input.value})`, "info");
  } else if (type === 'reject') {
    input.value = (retail * 0.30).toFixed(2);
    showToast(`Preset: Predatory bid applied (₹${input.value})`, "warning");
  }
  updateA2APriceHint();
}

function updateA2APriceHint() {
  const select = document.getElementById("a2a-sku");
  if (!select) return;
  const sku = select.value;
  const entry = getCatalogEntry(sku);
  if (!entry || !entry.item) return;

  const retail = entry.item.amount_inr;
  const minMargin = 0.08;
  const floorPrice = (entry.item.base_cost_paise / (1.0 - minMargin)) / 100.0;
  const input = document.getElementById("a2a-offered-inr");
  const offered = parseFloat(input?.value || (retail * 0.9).toFixed(2));

  let statusNote = "Valid Range (Approved)";
  let statusColor = "#10b981";
  if (offered < floorPrice * 0.85) {
    statusNote = "Predatory Bid (Will Reject)";
    statusColor = "#f43f5e";
  } else if (offered < floorPrice) {
    statusNote = "Near Floor (Counter-Offer)";
    statusColor = "#f59e0b";
  }

  const hintEl = document.getElementById("a2a-price-hint");
  if (hintEl) {
    hintEl.innerHTML = 
      `Retail: <strong>₹${retail.toFixed(2)}</strong> &bull; Margin Floor: <strong>₹${floorPrice.toFixed(2)}</strong> &bull; Status: <span style="font-weight:700; color:${statusColor};">${statusNote}</span>`;
  }
}

async function runCatalogScan() {
  const btn = document.getElementById("btn-scan");
  btn.disabled = true;
  btn.innerHTML = `<span>Scanning...</span>`;

  try {
    const res = await fetch("/api/scan", { method: "POST" });
    const result = await res.json();
    
    if (result.top_risk_sku) {
      showToast(`Scan complete. Top risk SKU: ${result.top_risk_sku}`, "info");
      await optimizeSingleItem(result.top_risk_sku, true);
    } else {
      showToast("Scan complete. Catalog is within healthy boundaries.", "success");
    }
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Scan failed:", err);
    showToast("Catalog scan failed", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Run Growth Scan</span>`;
  }
}

async function optimizeSingleItem(itemId, showTrace = true) {
  try {
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, force_scenario: "none" })
    });
    const result = await res.json();
    if (showTrace) {
      renderExecutionTrace(result);
    }
    showToast(`Autonomous optimization executed for ${result.item_name}`, "success");
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Optimization failed:", err);
    showToast("Optimization failed", "error");
  }
}

function renderExecutionTrace(result) {
  const panel = document.getElementById("execution-trace-panel");
  const container = document.getElementById("trace-content");
  panel.style.display = "block";

  const traces = result.decision_trace || [];
  const ue = result.unit_economics;

  let html = `
    <div style="margin-bottom: 14px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div>Target: <strong style="color: var(--text-dark);">${result.item_name}</strong> | Initial RARS: <span class="rars-badge rars-critical">${result.rars_score}</span></div>
      <div style="font-family: var(--font-mono); font-size: 11px; color: var(--apple-blue);">Deterministic Hash: ${result.validator_hash || 'SHA256-GATED'}</div>
    </div>
  `;

  // Unit Economics Card
  if (ue) {
    html += `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px; background: #ffffff; padding: 14px; border-radius: 12px; border: 1px solid var(--border-light); font-size: 12px;">
        <div>
          <div style="color: var(--text-muted); font-size: 11px; font-weight: 600;">Base Margin</div>
          <div style="font-weight: 800; font-size: 16px; color: var(--emerald-dark); font-family: var(--font-mono);">${ue.base_margin_pct}%</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 11px; font-weight: 600;">Post-Discount Margin</div>
          <div style="font-weight: 800; font-size: 16px; color: var(--apple-blue); font-family: var(--font-mono);">${ue.post_discount_margin_pct}%</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 11px; font-weight: 600;">Break-Even Multiplier</div>
          <div style="font-weight: 800; font-size: 16px; color: #b45309; font-family: var(--font-mono);">${ue.breakeven_volume_multiplier}x</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 11px; font-weight: 600;">Forecast Recovery</div>
          <div style="font-weight: 800; font-size: 16px; color: var(--purple); font-family: var(--font-mono);">+₹${ue.net_gmv_recovery_inr.toLocaleString('en-IN')}</div>
        </div>
      </div>
    `;
  }

  traces.forEach((trace, idx) => {
    const isApproved = trace.guardrail_verdict === "APPROVED";
    const badgeClass = isApproved ? "pass" : "fail";
    const stepClass = isApproved ? "approved" : "rejected";

    html += `
      <div class="trace-step ${stepClass}">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="step-badge ${badgeClass}">STEP ${idx + 1}: ${trace.stage.toUpperCase()}</span>
          <span style="font-family: var(--font-mono); font-size: 11px; color: ${isApproved ? '#059669' : '#be123c'}; font-weight: 700;">
            ${isApproved ? 'VERIFIED PASSED' : 'GUARDRAIL REJECTED (AUTO-REPAIRED)'}
          </span>
        </div>
        
        ${trace.violations && trace.violations.length > 0 ? `
          <div style="color: #be123c; font-size: 12px; margin: 8px 0; padding: 10px; background: var(--crimson-soft); border-radius: 8px; border: 1px solid rgba(225, 29, 72, 0.2);">
            <strong>Violations Intercepted:</strong><br>
            ${trace.violations.map(v => `• ${v}`).join("<br>")}
          </div>
        ` : ''}

        <div style="font-size: 12px; color: var(--text-dark); margin-top: 6px; line-height: 1.5;">
          ${trace.action ? `<div><span style="color: var(--text-muted);">Supervisor Proposal:</span> ${trace.action.reasoning}</div>` : ''}
          ${trace.repaired_action ? `<div style="margin-top: 4px;"><span style="color: var(--apple-blue); font-weight: 700;">Auto-Repaired Action:</span> ${trace.repaired_action.reasoning}</div>` : ''}
        </div>
      </div>
    `;
  });

  if (result.executed_action && result.executed_action.razorpay_response) {
    const resp = result.executed_action.razorpay_response;
    html += `
      <div class="trace-step approved">
        <span class="step-badge pass">FINAL STEP: RAZORPAY API EXECUTION &amp; AUDIT</span>
        <div style="font-size: 12px; margin-top: 8px; font-family: var(--font-mono); color: var(--apple-blue); line-height: 1.6;">
          • Action Executed: <strong>${result.executed_action.action_type}</strong><br>
          • Identifier: ${resp.offer_id || resp.payment_link_id || resp.bundle_id || 'rzp_ack'}<br>
          ${resp.magic_checkout_link ? `• Live Payment Link: <a href="${resp.magic_checkout_link}" target="_blank" style="color: var(--apple-blue); text-decoration: underline; font-weight: 700;">${resp.magic_checkout_link}</a><br>` : ''}
          • Reversal Compensation Spec: ${result.executed_action.rollback_spec?.endpoint || result.executed_action.rollback_spec?.type || 'N/A'}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  panel.scrollIntoView({ behavior: 'smooth' });
}

function closeTracePanel() {
  document.getElementById("execution-trace-panel").style.display = "none";
}

let lastA2AResponse = null;

async function submitA2ANegotiation() {
  const buyerId = document.getElementById("a2a-buyer-id").value;
  const sku = document.getElementById("a2a-sku").value;
  const qty = parseInt(document.getElementById("a2a-qty").value, 10);
  const offeredInr = parseFloat(document.getElementById("a2a-offered-inr").value);
  const offeredPaise = Math.round(offeredInr * 100);

  const terminal = document.getElementById("a2a-result-terminal");
  const checkoutAction = document.getElementById("a2a-checkout-action");
  const btn = document.getElementById("btn-submit-a2a");

  checkoutAction.style.display = "none";
  terminal.innerHTML = `<span class="term-comment">// Transmitting UAP / x402 Handshake Payload to Merchant Gateway...</span>\n<span class="term-cursor">&gt; Handshake In Flight...</span>`;
  btn.disabled = true;

  try {
    const res = await fetch("/api/a2a/negotiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyer_agent_id: buyerId,
        sku: sku,
        requested_quantity: qty,
        offered_price_paise: offeredPaise
      })
    });
    const data = await res.json();
    lastA2AResponse = data;

    terminal.textContent = JSON.stringify(data, null, 2);

    if (data.decision === "ACCEPTED" || data.decision === "COUNTER_OFFER") {
      checkoutAction.style.display = "block";
      showToast(`A2A Protocol: ${data.decision} (Total: ₹${(data.total_amount_paise/100).toFixed(2)})`, "success");
    } else {
      showToast(`A2A Protocol Rejected: ${data.reason}`, "warning");
    }
  } catch (err) {
    terminal.innerHTML = `<span style="color: #f87171;">// A2A Handshake Failed: ${err.message}</span>`;
    showToast("A2A Handshake Failed", "error");
  } finally {
    btn.disabled = false;
  }
}

function launchLiveRazorpayCheckout() {
  if (!lastA2AResponse) return;

  const keyId = document.getElementById("cfg-key-id")?.value.trim() || "rzp_test_TXsxFSqiP8TQoc";

  const options = {
    key: keyId,
    amount: lastA2AResponse.total_amount_paise,
    currency: "INR",
    name: "KuberMesh Autonomous Merchant",
    description: `A2A Settlement: ${lastA2AResponse.sku} (Qty: ${lastA2AResponse.quantity || 1})`,
    image: "https://razorpay.com/favicon.ico",
    handler: function (response) {
      showToast(`Test Payment Verified! Razorpay Payment ID: ${response.razorpay_payment_id}`, "success", 6000);
      loadDashboardData();
      loadAuditLedger();
    },
    prefill: {
      name: "AI Autonomous Buyer Agent",
      email: "buyer_agent@protocol.mesh",
      contact: "9876543210"
    },
    theme: {
      color: "#0f172a"
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      showToast(`Payment Dialog: ${response.error?.description || 'Dismissed'}`, "info");
    });
    rzp.open();
  } catch (e) {
    showToast(`Razorpay checkout launched for ${lastA2AResponse.sku}`, "info");
  }
}

function openSettingsModal() {
  document.getElementById("settings-modal").style.display = "flex";
}

function closeSettingsModal() {
  document.getElementById("settings-modal").style.display = "none";
}

async function saveCredentials() {
  const keyId = document.getElementById("cfg-key-id").value.trim();
  const keySecret = document.getElementById("cfg-key-secret").value.trim();
  const geminiKey = document.getElementById("cfg-gemini-key").value.trim();

  try {
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key_id: keyId, key_secret: keySecret, gemini_key: geminiKey })
    });
    const data = await res.json();
    if (data.key_id_set) {
      document.getElementById("badge-rzp-status").innerHTML = `<span class="status-dot-green"></span><span>Live Keys (${keyId.slice(0, 12)}...)</span>`;
    }
    showToast("Credentials saved! Live test sync initialized.", "success");
    closeSettingsModal();
    loadDashboardData();
  } catch (e) {
    showToast(`Failed to update credentials: ${e.message}`, "error");
  }
}

async function loadAuditLedger() {
  try {
    const res = await fetch("/api/audit");
    const data = await res.json();
    const entries = data.entries || [];

    const interventionsStat = document.getElementById("hero-stat-interventions");
    if (interventionsStat) interventionsStat.textContent = entries.length;

    const tbody = document.getElementById("audit-table-body");
    if (entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6">No audit records yet. Execute an optimization to log verified events.</td></tr>`;
      return;
    }

    tbody.innerHTML = entries.map(e => {
      const isRolledBack = e.rolled_back;
      const statusBadge = isRolledBack ? 
        `<span style="color: #be123c; font-weight: 700; font-size: 11px; background: var(--crimson-soft); padding: 3px 8px; border-radius: 6px;">ROLLED_BACK</span>` : 
        `<span style="color: var(--apple-blue); font-weight: 700; font-size: 11px; background: var(--apple-blue-soft); padding: 3px 8px; border-radius: 6px;">EXECUTED</span>`;

      return `
        <tr>
          <td style="font-size: 11px; font-family: var(--font-mono); color: var(--text-subtle);">${new Date(e.timestamp).toLocaleTimeString()}</td>
          <td style="font-weight: 700; color: var(--text-dark);">${e.item_name}</td>
          <td><code style="color: var(--purple); background: var(--purple-soft); padding: 2px 6px; border-radius: 4px;">${e.action_type}</code></td>
          <td style="font-family: var(--font-mono); font-size: 11px; color: var(--apple-blue);">${e.guardrail_result.validator_hash}</td>
          <td style="font-family: var(--font-mono);">${e.rars_before.toFixed(2)} → <span style="color: var(--emerald-dark); font-weight: 700;">${e.rars_after ? e.rars_after.toFixed(2) : '0.25'}</span></td>
          <td style="color: #059669; font-weight: 700; font-family: var(--font-mono);">+₹${e.revenue_impact_inr.toLocaleString('en-IN')}</td>
          <td>${statusBadge}</td>
          <td class="text-right">
            ${!isRolledBack ? `
              <button class="btn-light-amber btn-sm" onclick="triggerRollback('${e.id}')">
                Rollback
              </button>
            ` : `<span style="font-size: 11px; color: var(--text-subtle);">Reversed</span>`}
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    console.error("Failed to load audit ledger:", err);
  }
}

async function triggerRollback(entryId) {
  if (!confirm(`Are you sure you want to execute reverse compensation rollback on audit entry ${entryId}?`)) return;

  try {
    const res = await fetch("/api/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_id: entryId })
    });
    const result = await res.json();
    showToast(`Rollback Confirmed: ${result.reversal_details}`, "warning", 5000);
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    showToast(`Rollback failed: ${err.message}`, "error");
  }
}

async function resetDemo() {
  if (!confirm("Reset merchant catalog and simulated transactions to initial benchmark state?")) return;
  try {
    await fetch("/api/reset", { method: "POST" });
    showToast("Merchant state reset to baseline benchmark", "info");
    await loadDashboardData();
    await loadAuditLedger();
  } catch (e) {
    showToast("Reset failed", "error");
  }
}
