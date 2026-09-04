// KUBERMESH // ARCHITECTURAL REVENUE CONTROLLER (SHARPLINK STYLE)
let currentCatalogData = [];

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
  loadAuditLedger();
  updateElasticitySimulation();
});

// Toast System
function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>[${type.toUpperCase()}]</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "all 0.2s ease";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

function copyProtocolUrl() {
  const url = `${window.location.origin}/api/a2a/catalog`;
  navigator.clipboard.writeText(url).then(() => {
    showToast(`COPIED PROTOCOL MANIFEST URL: ${url}`, "success");
  }).catch(() => {
    prompt("COPY MANIFEST URL:", url);
  });
}

function updateElasticitySimulation() {
  const slider = document.getElementById("sim-discount-slider");
  if (!slider) return;
  const discount = parseFloat(slider.value);
  document.getElementById("sim-discount-val").textContent = `${discount}%`;

  const baseMargin = 35.0; // Baseline catalog margin
  const postMargin = Math.max(0, baseMargin - discount);
  const breakevenUplift = postMargin > 0 ? (baseMargin / postMargin).toFixed(2) : "∞";
  const recoveryRate = (Math.min(75, discount * 3.5 + 5)).toFixed(1);

  document.getElementById("sim-post-margin").textContent = `${postMargin.toFixed(1)}%`;
  document.getElementById("sim-breakeven-uplift").textContent = `${breakevenUplift}x`;
  document.getElementById("sim-recovery-rate").textContent = `+${recoveryRate}%`;

  const badge = document.getElementById("simulator-guardrail-badge");
  const badgeText = document.getElementById("simulator-badge-text");
  if (discount > 20.0 || postMargin < 8.0) {
    badge.className = "guardrail-chip breach";
    badgeText.textContent = "STATUS: BREACH BLOCKED BY G-01 / G-02";
  } else {
    badge.className = "guardrail-chip safe";
    badgeText.textContent = "STATUS: SAFE ZONE (G-01 & G-02 VERIFIED)";
  }
}

function switchTab(tabId) {
  document.querySelectorAll(".matrix-nav-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".matrix-panel").forEach(content => content.classList.remove("active"));

  const btn = document.getElementById(`tab-btn-${tabId}`);
  const content = document.getElementById(`tab-${tabId}`);
  if (btn) btn.classList.add("active");
  if (content) content.classList.add("active");

  if (tabId === 'audit') {
    loadAuditLedger();
  }
}

async function loadDashboardData() {
  try {
    const res = await fetch("/api/catalog");
    const data = await res.json();
    currentCatalogData = data.items || [];

    // Update Top Metrics
    const totalLeakage = data.total_revenue_at_risk_inr || 0;
    document.getElementById("metric-total-leakage").textContent = `₹${totalLeakage.toLocaleString('en-IN')}`;
    
    // Render Catalog Table
    renderCatalogTable(currentCatalogData);
    populateA2ASelect(currentCatalogData);
  } catch (err) {
    console.error("Failed to load catalog data:", err);
    showToast("FAILED TO SYNC CATALOG TELEMETRY", "error");
  }
}

function renderCatalogTable(items) {
  const tbody = document.getElementById("catalog-table-body");
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8">NO ACTIVE CATALOG SKUS DISCOVERED.</td></tr>`;
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
          <div style="font-weight: 700; color: #ffffff;">${item.name}</div>
          <div style="font-size: 10px; color: var(--text-tertiary); font-family: var(--font-code);">SKU: ${item.id}</div>
        </td>
        <td style="font-family: var(--font-code); font-weight: 700;">₹${item.amount_inr.toFixed(2)}</td>
        <td style="color: var(--emerald); font-weight: 700; font-family: var(--font-code);">${item.base_margin_pct}%</td>
        <td>
          <div style="font-weight: 700; font-family: var(--font-code);">${(prof.cart_abandonment_rate * 100).toFixed(1)}%</div>
          <div style="font-size: 10px; color: var(--text-tertiary); font-family: var(--font-mono);">${prof.total_orders_abandoned}/${prof.total_orders_created} CARTS</div>
        </td>
        <td style="font-family: var(--font-code);">${prof.sales_velocity_7d} <span style="font-size: 10px; color: var(--text-tertiary); font-family: var(--font-mono);">ORD/DAY</span></td>
        <td style="font-family: var(--font-code);">${prof.stagnation_days} <span style="font-size: 10px; color: var(--text-tertiary); font-family: var(--font-mono);">DAYS</span></td>
        <td>
          <span class="rars-badge ${rarsClass}">
            ${rars.score.toFixed(2)} // ${rars.risk_level}
          </span>
        </td>
        <td class="col-actions">
          <div style="display: inline-flex; gap: 6px; align-items: center;">
            <button class="industrial-btn btn-indigo" onclick="optimizeSingleItem('${item.id}')">
              OPTIMIZE
            </button>
            <button class="industrial-btn btn-amber" title="Simulate 15 cart drop-offs" onclick="injectChaos('${item.id}', 'abandonment_spike')">
              + DROP-OFF
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
    showToast(`INJECTED 15 SIMULATED DROP-OFFS FOR SKU ${itemId}`, "warning");
    await loadDashboardData();
  } catch (err) {
    console.error("Traffic injection failed:", err);
    showToast("TRAFFIC SIMULATION FAILED", "error");
  }
}

async function triggerMultiScenarioDemo() {
  const scenario = document.getElementById("select-failure-scenario").value;
  const btn = document.getElementById("btn-fail-demo");
  btn.disabled = true;
  btn.innerHTML = `<span>INTERCEPTING &amp; AUTO-REPAIRING...</span>`;

  try {
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force_scenario: scenario })
    });
    const result = await res.json();
    renderExecutionTrace(result);
    showToast(`GUARDRAIL INTERCEPTED &amp; AUTO-REPAIRED`, "success");
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Scenario demo failed:", err);
    showToast("SCENARIO EXECUTION FAILED", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>TEST GUARDRAIL DEFENSE</span>`;
  }
}

function populateA2ASelect(items) {
  const select = document.getElementById("a2a-sku");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = items.map(entry => {
    return `<option value="${entry.item.id}">${entry.item.name} (₹${entry.item.amount_inr})</option>`;
  }).join("");
  if (currentVal && items.some(e => e.item.id === currentVal)) {
    select.value = currentVal;
  }
  updateA2APriceHint();
}

function updateA2APriceHint() {
  const select = document.getElementById("a2a-sku");
  if (!select) return;
  const sku = select.value;
  const entry = currentCatalogData.find(e => e.item.id === sku);
  if (!entry) return;

  const retail = entry.item.amount_inr;
  const floorPrice = (entry.item.base_cost_paise / (1.0 - 0.08)) / 100.0;
  const qty = parseInt(document.getElementById("a2a-qty")?.value || "1", 10);

  document.getElementById("a2a-price-hint").textContent = 
    `RETAIL: ₹${retail.toFixed(2)}/UNIT | FLOOR PRICE (8% MARGIN FLOOR): ₹${floorPrice.toFixed(2)}/UNIT | QTY: ${qty}`;
}

async function runCatalogScan() {
  const btn = document.getElementById("btn-scan");
  btn.disabled = true;
  btn.innerHTML = `<span>SCANNING CATALOG...</span>`;

  try {
    const res = await fetch("/api/scan", { method: "POST" });
    const result = await res.json();
    
    if (result.top_risk_sku) {
      showToast(`IDENTIFIED TOP RISK SKU: ${result.top_risk_sku}`, "info");
      await optimizeSingleItem(result.top_risk_sku, true);
    } else {
      showToast("ALL CATALOG SKUS WITHIN HEALTHY BOUNDS", "success");
    }
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Scan failed:", err);
    showToast("CATALOG SCAN FAILED", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>EXECUTE GROWTH SCAN</span>`;
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
    showToast(`OPTIMIZATION APPLIED FOR ${result.item_name}`, "success");
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Optimization failed:", err);
    showToast("OPTIMIZATION FAILED", "error");
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
      <div>TARGET: <strong style="color: #ffffff;">${result.item_name}</strong> | INITIAL RARS: <span class="rars-badge rars-critical">${result.rars_score}</span></div>
      <div style="font-family: var(--font-code); font-size: 11px; color: var(--cyan);">DETERMINISTIC HASH: ${result.validator_hash || 'SHA256-GATED'}</div>
    </div>
  `;

  // Unit Economics Card
  if (ue) {
    html += `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 14px; background: var(--bg-main); padding: 12px 14px; border: 1px solid var(--border-line); font-size: 12px;">
        <div>
          <div style="color: var(--text-tertiary); font-size: 10px; font-family: var(--font-mono); font-weight: 700;">BASE MARGIN</div>
          <div style="font-weight: 700; font-size: 16px; color: var(--emerald); font-family: var(--font-code);">${ue.base_margin_pct}%</div>
        </div>
        <div>
          <div style="color: var(--text-tertiary); font-size: 10px; font-family: var(--font-mono); font-weight: 700;">POST-DISCOUNT MARGIN</div>
          <div style="font-weight: 700; font-size: 16px; color: var(--cyan); font-family: var(--font-code);">${ue.post_discount_margin_pct}%</div>
        </div>
        <div>
          <div style="color: var(--text-tertiary); font-size: 10px; font-family: var(--font-mono); font-weight: 700;">BREAK-EVEN MULTIPLIER</div>
          <div style="font-weight: 700; font-size: 16px; color: var(--amber); font-family: var(--font-code);">${ue.breakeven_volume_multiplier}x</div>
        </div>
        <div>
          <div style="color: var(--text-tertiary); font-size: 10px; font-family: var(--font-mono); font-weight: 700;">FORECAST RECOVERY</div>
          <div style="font-weight: 700; font-size: 16px; color: #b388ff; font-family: var(--font-code);">+₹${ue.net_gmv_recovery_inr.toLocaleString('en-IN')}</div>
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
          <span style="font-family: var(--font-code); font-size: 11px; color: ${isApproved ? 'var(--emerald)' : 'var(--crimson)'}; font-weight: 700;">
            ${isApproved ? 'VERIFIED PASSED' : 'GUARDRAIL REJECTED (AUTO-REPAIRED)'}
          </span>
        </div>
        
        ${trace.violations && trace.violations.length > 0 ? `
          <div style="color: var(--crimson); font-size: 12px; margin: 6px 0; padding: 8px 10px; background: var(--crimson-soft); border: 1px solid rgba(255, 23, 68, 0.3);">
            <strong>VIOLATIONS INTERCEPTED:</strong><br>
            ${trace.violations.map(v => `• ${v}`).join("<br>")}
          </div>
        ` : ''}

        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.5;">
          ${trace.action ? `<div><span style="color: var(--text-tertiary);">SUPERVISOR PROPOSAL:</span> ${trace.action.reasoning}</div>` : ''}
          ${trace.repaired_action ? `<div style="margin-top: 3px;"><span style="color: var(--cyan); font-weight: 700;">AUTO-REPAIRED ACTION:</span> ${trace.repaired_action.reasoning}</div>` : ''}
        </div>
      </div>
    `;
  });

  if (result.executed_action && result.executed_action.razorpay_response) {
    const resp = result.executed_action.razorpay_response;
    html += `
      <div class="trace-step approved">
        <span class="step-badge pass">FINAL STEP: RAZORPAY API EXECUTION & AUDIT</span>
        <div style="font-size: 12px; margin-top: 6px; font-family: var(--font-code); color: var(--cyan); line-height: 1.6;">
          • ACTION EXECUTED: <strong>${result.executed_action.action_type}</strong><br>
          • IDENTIFIER: ${resp.offer_id || resp.payment_link_id || resp.bundle_id || 'rzp_ack'}<br>
          ${resp.magic_checkout_link ? `• LIVE PAYMENT LINK: <a href="${resp.magic_checkout_link}" target="_blank" style="color: var(--cyan); text-decoration: underline; font-weight: 700;">${resp.magic_checkout_link}</a><br>` : ''}
          • REVERSAL SPEC: ${result.executed_action.rollback_spec?.endpoint || result.executed_action.rollback_spec?.type || 'N/A'}
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
  checkoutAction.style.display = "none";
  terminal.innerHTML = `<span style="color: var(--amber);">// TRANSMITTING UAP / x402 HANDSHAKE PAYLOAD TO MERCHANT AGENT ENDPOINT...</span>`;

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
      showToast(`NEGOTIATION RESULT: ${data.decision} (TOTAL: ₹${(data.total_amount_paise/100).toFixed(2)})`, "success");
    } else {
      showToast(`NEGOTIATION REJECTED: ${data.reason}`, "warning");
    }
  } catch (err) {
    terminal.innerHTML = `<span style="color: var(--crimson);">// A2A HANDSHAKE FAILED: ${err.message}</span>`;
    showToast("A2A HANDSHAKE FAILED", "error");
  }
}

function launchLiveRazorpayCheckout() {
  if (!lastA2AResponse) return;

  const options = {
    key: "rzp_test_kubermesh_demo",
    amount: lastA2AResponse.total_amount_paise,
    currency: "INR",
    name: "Apex Electronics Hub",
    description: `A2A Purchase: ${lastA2AResponse.sku} (${lastA2AResponse.quantity} unit)`,
    image: "https://razorpay.com/favicon.ico",
    order_id: lastA2AResponse.razorpay_order_id,
    handler: function (response) {
      showToast(`PAYMENT CONFIRMED: ID ${response.razorpay_payment_id}`, "success", 5000);
      loadDashboardData();
      loadAuditLedger();
    },
    prefill: {
      name: "AI Buyer Agent (Automated)",
      email: "buyer_agent@protocol.mesh",
      contact: "9876543210"
    },
    theme: {
      color: "#651fff"
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      showToast(`PAYMENT FAILED: ${response.error.description}`, "error");
    });
    rzp.open();
  } catch (e) {
    showToast(`LAUNCHED CHECKOUT FOR ORDER ${lastA2AResponse.razorpay_order_id}`, "info");
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
      document.getElementById("node-rzp-status").innerHTML = `<span class="node-indicator online"></span><span class="node-text">RZP_LIVE: ${keyId.slice(0, 12)}...</span>`;
    }
    showToast("CREDENTIALS SAVED &amp; SYNC INITIALIZED", "success");
    closeSettingsModal();
    loadDashboardData();
  } catch (e) {
    showToast(`UPDATE FAILED: ${e.message}`, "error");
  }
}

async function loadAuditLedger() {
  try {
    const res = await fetch("/api/audit");
    const data = await res.json();
    const entries = data.entries || [];

    document.getElementById("metric-interventions").textContent = entries.length;

    const tbody = document.getElementById("audit-table-body");
    if (entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8">NO AUDIT ENTRIES DISCOVERED. EXECUTE AN OPTIMIZATION TO LOG EVENTS.</td></tr>`;
      return;
    }

    tbody.innerHTML = entries.map(e => {
      const isRolledBack = e.rolled_back;
      const statusBadge = isRolledBack ? 
        `<span style="color: var(--crimson); font-family: var(--font-code); font-weight: 700;">ROLLED_BACK</span>` : 
        `<span style="color: var(--cyan); font-family: var(--font-code); font-weight: 700;">EXECUTED</span>`;

      return `
        <tr>
          <td style="font-size: 11px; font-family: var(--font-code); color: var(--text-tertiary);">${new Date(e.timestamp).toLocaleTimeString()}</td>
          <td style="font-weight: 700; color: #ffffff;">${e.item_name}</td>
          <td><code style="color: var(--cyan); font-family: var(--font-code); font-size: 11px;">${e.action_type}</code></td>
          <td style="font-family: var(--font-code); font-size: 11px; color: var(--cyan);">${e.guardrail_result.validator_hash}</td>
          <td style="font-family: var(--font-code);">${e.rars_before.toFixed(2)} → <span style="color: var(--emerald); font-weight: 700;">${e.rars_after ? e.rars_after.toFixed(2) : '0.25'}</span></td>
          <td style="color: var(--emerald); font-weight: 700; font-family: var(--font-code);">+₹${e.revenue_impact_inr.toLocaleString('en-IN')}</td>
          <td>${statusBadge}</td>
          <td class="col-actions">
            ${!isRolledBack ? `
              <button class="industrial-btn btn-amber" onclick="triggerRollback('${e.id}')">
                ROLLBACK
              </button>
            ` : `<span style="font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono);">REVERSED</span>`}
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    console.error("Failed to load audit ledger:", err);
  }
}

async function triggerRollback(entryId) {
  if (!confirm(`CONFIRM REVERSE COMPENSATION ROLLBACK ON AUDIT ENTRY ${entryId}?`)) return;

  try {
    const res = await fetch("/api/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_id: entryId })
    });
    const result = await res.json();
    showToast(`ROLLBACK CONFIRMED: ${result.reversal_details}`, "warning", 5000);
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    showToast(`ROLLBACK FAILED: ${err.message}`, "error");
  }
}

async function resetDemo() {
  if (!confirm("RESET MERCHANT STATE TO BASELINE BENCHMARK?")) return;
  try {
    await fetch("/api/reset", { method: "POST" });
    showToast("STATE RESET TO BENCHMARK", "info");
    await loadDashboardData();
    await loadAuditLedger();
  } catch (e) {
    showToast("RESET FAILED", "error");
  }
}
