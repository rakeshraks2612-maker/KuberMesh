// KuberMesh Frontend Controller
let currentCatalogData = [];

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
  loadAuditLedger();
});

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

  document.getElementById(`tab-btn-${tabId}`).classList.add("active");
  document.getElementById(`tab-${tabId}`).classList.add("active");

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
    document.getElementById("metric-total-leakage").textContent = `₹${data.total_revenue_at_risk_inr.toLocaleString('en-IN')}`;
    
    // Render Catalog Table
    renderCatalogTable(currentCatalogData);
    populateA2ASelect(currentCatalogData);
  } catch (err) {
    console.error("Failed to load catalog data:", err);
  }
}

function renderCatalogTable(items) {
  const tbody = document.getElementById("catalog-table-body");
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No catalog items available.</td></tr>`;
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
          <div style="font-weight: 700;">${item.name}</div>
          <div style="font-size: 11px; color: var(--text-dim); font-family: monospace;">SKU: ${item.id}</div>
        </td>
        <td style="font-family: monospace; font-weight: 600;">₹${item.amount_inr.toFixed(2)}</td>
        <td style="color: #34d399; font-weight: 600;">${item.base_margin_pct}%</td>
        <td>
          <div style="font-weight: 600;">${(prof.cart_abandonment_rate * 100).toFixed(1)}%</div>
          <div style="font-size: 11px; color: var(--text-dim);">${prof.total_orders_abandoned}/${prof.total_orders_created} carts</div>
        </td>
        <td>${prof.sales_velocity_7d} <span style="font-size: 11px; color: var(--text-dim);">orders/day</span></td>
        <td>${prof.stagnation_days} <span style="font-size: 11px; color: var(--text-dim);">days</span></td>
        <td>
          <span class="rars-badge ${rarsClass}">
            ${rars.score.toFixed(2)} • ${rars.risk_level}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-primary btn-sm" onclick="optimizeSingleItem('${item.id}')">
              Optimize
            </button>
            <button class="btn btn-secondary btn-sm" title="Simulate 15 cart drop-offs" onclick="injectChaos('${item.id}', 'abandonment_spike')">
              ⚡ Drop-off
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
    alert(`⚡ Injected 15 simulated cart drop-offs for SKU ${itemId}. Recalculating RARS...`);
    await loadDashboardData();
  } catch (err) {
    console.error("Traffic injection failed:", err);
  }
}

async function triggerMultiScenarioDemo() {
  const scenario = document.getElementById("select-failure-scenario").value;
  const btn = document.getElementById("btn-fail-demo");
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-icon">⏳</span> Intercepting Breach & Auto-Repairing...`;

  try {
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force_scenario: scenario })
    });
    const result = await res.json();
    renderExecutionTrace(result);
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Scenario demo failed:", err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-icon">🛡️</span> Test Selected Guardrail`;
  }
}

function populateA2ASelect(items) {
  const select = document.getElementById("a2a-sku");
  if (!select) return;
  select.innerHTML = items.map(entry => {
    return `<option value="${entry.item.id}">${entry.item.name} (₹${entry.item.amount_inr})</option>`;
  }).join("");
  updateA2APriceHint();
}

function updateA2APriceHint() {
  const select = document.getElementById("a2a-sku");
  const sku = select.value;
  const entry = currentCatalogData.find(e => e.item.id === sku);
  if (!entry) return;

  const retail = entry.item.amount_inr;
  const floorPrice = (entry.item.base_cost_paise / (1.0 - 0.08)) / 100.0;
  document.getElementById("a2a-price-hint").textContent = 
    `Retail: ₹${retail.toFixed(2)} | Floor Price (8% Margin Floor): ₹${floorPrice.toFixed(2)}`;
}

async function runCatalogScan() {
  const btn = document.getElementById("btn-scan");
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-icon">⏳</span> Scanning...`;

  try {
    const res = await fetch("/api/scan", { method: "POST" });
    const result = await res.json();
    
    if (result.top_risk_sku) {
      await optimizeSingleItem(result.top_risk_sku, false);
    }
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Scan failed:", err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-icon">⚡</span> Run Autonomous Growth Scan`;
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
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    console.error("Optimization failed:", err);
  }
}

function renderExecutionTrace(result) {
  const panel = document.getElementById("execution-trace-panel");
  const container = document.getElementById("trace-content");
  panel.style.display = "block";

  const traces = result.decision_trace || [];
  const ue = result.unit_economics;

  let html = `
    <div style="margin-bottom: 14px; font-size: 13px;">
      Target: <strong>${result.item_name}</strong> | Initial RARS: <span class="rars-badge rars-critical">${result.rars_score}</span>
    </div>
  `;

  // Unit Economics Card
  if (ue) {
    html += `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 12px;">
        <div>
          <div style="color: var(--text-muted); font-size: 11px;">Base Margin</div>
          <div style="font-weight: 700; color: #34d399;">${ue.base_margin_pct}%</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 11px;">Post-Discount Margin</div>
          <div style="font-weight: 700; color: #38bdf8;">${ue.post_discount_margin_pct}%</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 11px;">Break-Even Vol Multiplier</div>
          <div style="font-weight: 700; color: #fbbf24;">${ue.breakeven_volume_multiplier}x</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 11px;">Forecast Recovery</div>
          <div style="font-weight: 700; color: #a78bfa;">+₹${ue.net_gmv_recovery_inr.toLocaleString('en-IN')}</div>
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
          <span class="step-badge ${badgeClass}">STEP ${idx + 1}: ${trace.stage}</span>
          <span style="font-family: monospace; font-size: 11px; color: var(--text-dim);">
            ${isApproved ? 'VERIFIED PASSED' : 'GUARDRAIL REJECTED'}
          </span>
        </div>
        
        ${trace.violations && trace.violations.length > 0 ? `
          <div style="color: #f87171; font-size: 12px; margin: 8px 0; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">
            ⚠️ <strong>Violations Detected:</strong><br>
            ${trace.violations.map(v => `• ${v}`).join("<br>")}
          </div>
        ` : ''}

        <div style="font-size: 12px; color: var(--text-main); margin-top: 6px;">
          ${trace.action ? `<strong>Proposal:</strong> ${trace.action.reasoning}` : ''}
          ${trace.repaired_action ? `<strong>Auto-Repaired Proposal:</strong> ${trace.repaired_action.reasoning}` : ''}
        </div>
      </div>
    `;
  });

  if (result.executed_action && result.executed_action.razorpay_response) {
    const resp = result.executed_action.razorpay_response;
    html += `
      <div class="trace-step approved">
        <span class="step-badge pass">FINAL STEP: RAZORPAY API EXECUTION & AUDIT</span>
        <div style="font-size: 12px; margin-top: 6px; font-family: monospace; color: #38bdf8;">
          • Action Executed: ${result.executed_action.action_type}<br>
          • Target Identifier: ${resp.offer_id || resp.payment_link_id || resp.bundle_id || 'rzp_ack'}<br>
          ${resp.magic_checkout_link ? `• Live Payment Link: <a href="${resp.magic_checkout_link}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${resp.magic_checkout_link}</a><br>` : ''}
          • Reversal Compensation Spec: ${result.executed_action.rollback_spec.endpoint || result.executed_action.rollback_spec.type}
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
  terminal.innerHTML = `<span style="color: #fbbf24;">// Transmitting UAP / x402 Handshake Payload to Merchant Agent Endpoint...</span>`;

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
    }
  } catch (err) {
    terminal.innerHTML = `<span style="color: #f87171;">// A2A Handshake Failed: ${err.message}</span>`;
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
      alert(`🎉 Test Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\nOrder ID: ${response.razorpay_order_id}\nSignature: ${response.razorpay_signature}`);
      loadDashboardData();
      loadAuditLedger();
    },
    prefill: {
      name: "AI Buyer Agent (Automated)",
      email: "buyer_agent@protocol.mesh",
      contact: "9876543210"
    },
    theme: {
      color: "#4f46e5"
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      alert(`⚠️ Test Payment Failed: ${response.error.description}`);
    });
    rzp.open();
  } catch (e) {
    alert(`Interactive Checkout Simulation: Razorpay SDK launched for order ${lastA2AResponse.razorpay_order_id} (Amount: ₹${(lastA2AResponse.total_amount_paise/100).toFixed(2)})`);
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
      document.getElementById("badge-rzp-mode").innerHTML = `<span class="status-dot green"></span> Live Test Keys Active`;
    }
    alert("Credentials saved! Live test sync initialized.");
    closeSettingsModal();
    loadDashboardData();
  } catch (e) {
    alert(`Failed to update credentials: ${e.message}`);
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
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">No audit entries recorded yet. Run an optimization to generate verified records.</td></tr>`;
      return;
    }

    tbody.innerHTML = entries.map(e => {
      const isRolledBack = e.rolled_back;
      const statusBadge = isRolledBack ? 
        `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171;">ROLLED_BACK</span>` : 
        `<span class="badge badge-rzp">EXECUTED</span>`;

      return `
        <tr>
          <td style="font-size: 11px; font-family: monospace; color: var(--text-dim);">${new Date(e.timestamp).toLocaleTimeString()}</td>
          <td style="font-weight: 600;">${e.item_name}</td>
          <td><code style="color: #818cf8;">${e.action_type}</code></td>
          <td style="font-family: monospace; font-size: 11px; color: #38bdf8;">${e.guardrail_result.validator_hash}</td>
          <td style="font-family: monospace;">${e.rars_before.toFixed(2)} → <span style="color: #34d399;">${e.rars_after ? e.rars_after.toFixed(2) : '0.25'}</span></td>
          <td style="color: #34d399; font-weight: 600;">+₹${e.revenue_impact_inr.toLocaleString('en-IN')}</td>
          <td>${statusBadge}</td>
          <td>
            ${!isRolledBack ? `
              <button class="btn btn-danger btn-sm" onclick="triggerRollback('${e.id}')">
                Rollback
              </button>
            ` : `<span style="font-size: 11px; color: var(--text-dim);">Reversed</span>`}
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
    alert(`Rollback Confirmed: ${result.reversal_details}`);
    await loadDashboardData();
    await loadAuditLedger();
  } catch (err) {
    alert(`Rollback failed: ${err.message}`);
  }
}

async function resetDemo() {
  if (!confirm("Reset merchant catalog and simulated transactions to initial benchmark state?")) return;
  await fetch("/api/reset", { method: "POST" });
  await loadDashboardData();
  await loadAuditLedger();
}
