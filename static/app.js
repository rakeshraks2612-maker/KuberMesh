// KUBERMESH CONTROLLER — MONEY MANAGEMENT PLATFORM EDITION
let currentCatalogData = [];

document.addEventListener("DOMContentLoaded", () => {
  initAmbientCanvas();
  initHeroCardsParallax();
  loadDashboardData();
  loadAuditLedger();
  updateElasticitySimulation();
});

// Interactive Neural Agent Commerce Graph Canvas Engine (OpenAI / Palantir Style)
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
    initGraph();
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

  // Nodes & Telemetry Network
  let nodes = [];
  let packets = [];

  const HUB_LABELS = ["NPCI UAP", "RAZORPAY VAULT", "ZERO-LLM SAFE", "BUYER MESH"];
  const PALETTE = [
    { fill: "#0284c7", glow: "2, 132, 199" },   // Azure
    { fill: "#6366f1", glow: "99, 102, 241" },  // Indigo
    { fill: "#10b981", glow: "16, 185, 129" },  // Emerald
    { fill: "#06b6d4", glow: "6, 182, 212" }    // Cyan
  ];

  function initGraph() {
    nodes = [];
    packets = [];
    const count = Math.min(52, Math.max(30, Math.floor((width * height) / 22000)));

    for (let i = 0; i < count; i++) {
      const isHub = i < 4;
      const theme = PALETTE[i % PALETTE.length];
      nodes.push({
        id: i,
        isHub: isHub,
        label: isHub ? HUB_LABELS[i] : null,
        x: Math.random() * width,
        y: Math.random() * height,
        baseX: Math.random() * width,
        baseY: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: isHub ? 4.5 : (i % 3 === 0 ? 3.0 : 2.0),
        color: theme.fill,
        glowColor: theme.glow,
        pulseOffset: Math.random() * 10,
        rippleRadius: 0,
        rippleAlpha: 0
      });
    }

    // Initialize Active Transaction Pulses along the graph
    for (let p = 0; p < 24; p++) {
      packets.push({
        from: Math.floor(Math.random() * nodes.length),
        to: Math.floor(Math.random() * nodes.length),
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.014,
        color: PALETTE[p % PALETTE.length].fill,
        glow: PALETTE[p % PALETTE.length].glow
      });
    }
  }

  resize();

  function draw() {
    ctx.clearRect(0, 0, width, height);
    time += 0.016;

    // Smooth Mouse Interpolation
    if (mouse.active) {
      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      // Radiant Cursor Field
      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
      grad.addColorStop(0, "rgba(2, 132, 199, 0.06)");
      grad.addColorStop(0.5, "rgba(99, 102, 241, 0.02)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 220, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1. Update Node Positions with Soft Float & Mouse Gravitational Pull
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      // Gentle Screen Bounding Bounce
      if (n.x < 30 || n.x > width - 30) n.vx *= -1;
      if (n.y < 30 || n.y > height - 30) n.vy *= -1;

      // Mouse Gravitational Spring Physics
      if (mouse.active) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 200 && dist > 0) {
          const force = (1 - dist / 200) * 0.45;
          n.x += (dx / dist) * force * 2.5;
          n.y += (dy / dist) * force * 2.5;
        }
      }

      // Update ripple ring on transaction receipt
      if (n.rippleAlpha > 0) {
        n.rippleRadius += 0.75;
        n.rippleAlpha -= 0.025;
      }
    }

    // 2. Draw Synaptic Graph Connections (Edges)
    const maxDist = 145;
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.32;
          
          // Hover highlighting
          const isNearMouse = mouse.active && (Math.hypot(mouse.x - n1.x, mouse.y - n1.y) < 160 || Math.hypot(mouse.x - n2.x, mouse.y - n2.y) < 160);
          const edgeAlpha = isNearMouse ? Math.min(0.65, alpha * 2.2) : alpha;

          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = `rgba(${n1.glowColor}, ${edgeAlpha})`;
          ctx.lineWidth = isNearMouse ? 1.4 : 0.85;
          ctx.stroke();
        }
      }
    }

    // 3. Update & Draw Live Transaction Pulses
    for (let p = 0; p < packets.length; p++) {
      const pkt = packets[p];
      pkt.progress += pkt.speed;

      const src = nodes[pkt.from];
      const tgt = nodes[pkt.to];

      if (!src || !tgt) continue;

      // If finished route or nodes too far, pick new route
      const dist = Math.hypot(src.x - tgt.x, src.y - tgt.y);
      if (pkt.progress >= 1 || dist > maxDist * 1.5) {
        pkt.from = pkt.to;
        // Pick random nearby neighbor
        let neighbors = [];
        for (let k = 0; k < nodes.length; k++) {
          if (k !== pkt.from && Math.hypot(nodes[pkt.from].x - nodes[k].x, nodes[pkt.from].y - nodes[k].y) < maxDist) {
            neighbors.push(k);
          }
        }
        pkt.to = neighbors.length > 0 ? neighbors[Math.floor(Math.random() * neighbors.length)] : Math.floor(Math.random() * nodes.length);
        pkt.progress = 0;

        // Trigger reception ripple on destination
        if (tgt) {
          tgt.rippleRadius = tgt.radius;
          tgt.rippleAlpha = 0.6;
        }
      }

      // Packet coordinates
      const px = src.x + (tgt.x - src.x) * pkt.progress;
      const py = src.y + (tgt.y - src.y) * pkt.progress;

      // Draw glowing packet comet
      const glow = ctx.createRadialGradient(px, py, 0, px, py, 8);
      glow.addColorStop(0, `rgba(${pkt.glow}, 0.7)`);
      glow.addColorStop(0.5, `rgba(${pkt.glow}, 0.2)`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    // 4. Draw Graph Nodes & Hub Badges
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const pulse = Math.sin(time * 2 + n.pulseOffset) * 0.5 + 0.5;

      // Draw transaction arrival ripple ring
      if (n.rippleAlpha > 0) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${n.glowColor}, ${n.rippleAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Hub Outer Orbit Ring
      if (n.isHub) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 6 + pulse * 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${n.glowColor}, ${0.25 + pulse * 0.25})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // Outer Glow Halo
      const nodeGlow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 3.5);
      nodeGlow.addColorStop(0, `rgba(${n.glowColor}, ${0.5 + pulse * 0.3})`);
      nodeGlow.addColorStop(1, "transparent");
      ctx.fillStyle = nodeGlow;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Node Core
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.isHub ? "#ffffff" : n.color;
      ctx.fill();

      if (n.isHub) {
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Hub Micro Tag Text
        ctx.font = "600 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + n.radius + 14);
      }
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
