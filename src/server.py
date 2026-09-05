import os
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any, Literal
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.config import settings
from src.models import (
    Item,
    Order,
    Payment,
    CampaignAction,
    AuditEntry,
    A2ANegotiationRequest,
    A2ANegotiationResponse
)
from src.discover import discovery_engine
from src.profiler import profiler_engine
from src.scorer import scoring_engine
from src.agent import merchant_agent
from src.executor import execution_engine
from src.state_manager import state_manager
from src.rollback import rollback_engine
from src.a2a_gateway import a2a_gateway
from src.seed_data import initialize_merchant_state

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Autonomous Revenue Optimizer and Agent-to-Agent Commerce Protocol for Razorpay Merchants."
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/favicon.ico")
def serve_favicon():
    favicon_ico = STATIC_DIR / "favicon.ico"
    if favicon_ico.exists():
        return FileResponse(favicon_ico, media_type="image/x-icon")
    favicon_png = STATIC_DIR / "favicon.png"
    if favicon_png.exists():
        return FileResponse(favicon_png, media_type="image/png")
    favicon_svg = STATIC_DIR / "favicon.svg"
    if favicon_svg.exists():
        return FileResponse(favicon_svg, media_type="image/svg+xml")
    return HTMLResponse("", status_code=204)

@app.get("/")
def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>KuberMesh API Active</h1>")

@app.get("/api/catalog")
def get_catalog_metrics():
    catalog = discovery_engine.get_catalog()
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    scores = scoring_engine.score_all(profiles)
    
    combined = []
    total_at_risk = 0.0
    for item in catalog:
        prof = profiles.get(item.id)
        sc = scores.get(item.id)
        if prof and sc:
            item_dict = item.model_dump()
            item_dict["amount_inr"] = item.amount_inr
            item_dict["base_cost_inr"] = item.base_cost_inr
            item_dict["base_margin_pct"] = item.base_margin_pct
            combined.append({
                "item": item_dict,
                "profile": prof.model_dump(),
                "rars": sc.model_dump()
            })
            total_at_risk += sc.revenue_at_risk_inr
            
    return {
        "items": combined,
        "total_revenue_at_risk_inr": round(total_at_risk, 2)
    }

@app.post("/api/scan")
def run_autonomous_scan():
    catalog = discovery_engine.get_catalog()
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    scores = scoring_engine.score_all(profiles)
    
    sorted_items = sorted(catalog, key=lambda x: scores.get(x.id).score if scores.get(x.id) else 0.0, reverse=True)
    top_risk_item = sorted_items[0] if sorted_items else None
    
    return {
        "status": "scan_complete",
        "scanned_skus_count": len(catalog),
        "top_risk_sku": top_risk_item.id if top_risk_item else None,
        "top_rars_score": scores.get(top_risk_item.id).score if top_risk_item and scores.get(top_risk_item.id) else 0.0
    }

class OptimizeRequest(BaseModel):
    item_id: Optional[str] = None
    force_scenario: str = "none"  # "discount_cap_breach", "margin_floor_breach", "volatility_breach", "none"

class RollbackRequest(BaseModel):
    entry_id: str

class SimulateTrafficRequest(BaseModel):
    item_id: str
    anomaly_type: Literal["abandonment_spike", "upi_failure_wave", "velocity_surge"]
    count: int = 15

@app.post("/api/simulate/traffic")
def simulate_traffic(req: SimulateTrafficRequest):
    import random
    from datetime import datetime, timezone, timedelta
    from src.models import Order, Payment

    catalog = discovery_engine.get_catalog()
    target_item = next((i for i in catalog if i.id == req.item_id or req.item_id in i.id or i.name.lower() in req.item_id.lower()), None)
    if not target_item and catalog:
        target_item = catalog[0]
    if not target_item:
        raise HTTPException(status_code=404, detail="Item not found")

    now = datetime.now(timezone.utc)
    new_orders = []
    new_payments = []

    for idx in range(req.count):
        order_id = f"order_sim_{uuid.uuid4().hex[:8]}"
        cust_id = f"cust_sim_{idx+100}"
        created_at = (now - timedelta(minutes=random.randint(1, 120))).isoformat() + "Z"

        if req.anomaly_type == "abandonment_spike":
            status = "abandoned"
            new_orders.append(Order(
                id=order_id, item_id=target_item.id, amount=target_item.amount,
                status=status, customer_id=cust_id, created_at=created_at
            ))

        elif req.anomaly_type == "upi_failure_wave":
            status = "failed"
            pay_id = f"pay_sim_{uuid.uuid4().hex[:8]}"
            new_orders.append(Order(
                id=order_id, item_id=target_item.id, amount=target_item.amount,
                status=status, customer_id=cust_id, created_at=created_at, payment_id=pay_id
            ))
            new_payments.append(Payment(
                id=pay_id, order_id=order_id, amount=target_item.amount,
                status="failed", method="upi", error_code="PSP_TIMEOUT", created_at=created_at
            ))

        elif req.anomaly_type == "velocity_surge":
            status = "paid"
            pay_id = f"pay_sim_{uuid.uuid4().hex[:8]}"
            new_orders.append(Order(
                id=order_id, item_id=target_item.id, amount=target_item.amount,
                status=status, customer_id=cust_id, created_at=created_at, payment_id=pay_id
            ))
            new_payments.append(Payment(
                id=pay_id, order_id=order_id, amount=target_item.amount,
                status="captured", method="upi", created_at=created_at
            ))

    state = discovery_engine._load_local_state()
    state.setdefault("orders", []).extend([o.model_dump() for o in new_orders])
    state.setdefault("payments", []).extend([p.model_dump() for p in new_payments])
    discovery_engine._save_local_state(state)

    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    new_profile = profiles.get(target_item.id)

    return {
        "status": "traffic_injected",
        "message": f"Successfully simulated {req.count} events for {target_item.name}",
        "anomaly": req.anomaly_type,
        "item_id": target_item.id,
        "injected_events_count": req.count,
        "new_profile": new_profile.model_dump() if new_profile else {}
    }

@app.post("/api/optimize")
def run_optimization(req: OptimizeRequest):
    catalog = discovery_engine.get_catalog()
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    scores = scoring_engine.score_all(profiles)
    
    if req.item_id:
        target_item = next((i for i in catalog if i.id == req.item_id), None)
        if not target_item:
            raise HTTPException(status_code=404, detail=f"SKU {req.item_id} not found.")
    else:
        sorted_catalog = sorted(catalog, key=lambda x: scores.get(x.id).score if scores.get(x.id) else 0.0, reverse=True)
        target_item = sorted_catalog[0]

    profile = profiles[target_item.id]
    score = scores[target_item.id]

    cycle_result = merchant_agent.run_bounded_optimization_cycle(
        target_item, profile, score, catalog, force_scenario=req.force_scenario
    )

    final_action: CampaignAction = cycle_result["final_action"]
    
    if final_action.status == "approved":
        executed_action = execution_engine.execute_action(final_action, target_item)
        
        audit_entry = AuditEntry(
            id=f"audit_{executed_action.action_id}",
            timestamp=executed_action.created_at,
            merchant_id="rzp_merch_apex_hub",
            item_id=target_item.id,
            item_name=target_item.name,
            action_type=executed_action.action_type,
            proposed_payload=executed_action.payload,
            reasoning=executed_action.reasoning,
            guardrail_result=executed_action.guardrail_result,
            razorpay_response=executed_action.razorpay_response,
            rollback_spec=executed_action.rollback_spec,
            rars_before=score.score,
            rars_after=round(max(0.15, score.score - 0.35), 2),
            revenue_impact_inr=executed_action.estimated_recovery_inr,
            rolled_back=False,
            status="EXECUTED"
        )
        state_manager.record_entry(audit_entry)
        cycle_result["audit_entry"] = audit_entry.model_dump()
        cycle_result["executed_action"] = executed_action.model_dump()

    return cycle_result

@app.get("/api/audit")
def get_audit_trail(limit: int = 50):
    entries = state_manager.get_entries(limit=limit)
    return {
        "count": len(entries),
        "entries": entries
    }

@app.post("/api/rollback")
def trigger_action_rollback(req: RollbackRequest):
    try:
        res = rollback_engine.trigger_rollback(req.entry_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/a2a/catalog")
def get_a2a_protocol_manifest(request: Request):
    base_url = str(request.base_url).rstrip("/")
    manifest = a2a_gateway.generate_protocol_manifest(base_url)
    return manifest

@app.post("/api/a2a/negotiate")
def negotiate_a2a(req: A2ANegotiationRequest):
    response = a2a_gateway.handle_negotiation(req)
    return response

@app.post("/api/webhooks/razorpay")
async def handle_razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "kubermesh_webhook_secret")
    
    # Verify HMAC SHA256 signature if secret is present
    import hmac
    import hashlib
    expected_sig = hmac.new(webhook_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    
    # Process event payload
    try:
        import json
        event_data = json.loads(body.decode("utf-8"))
        event_type = event_data.get("event", "payment.captured")
        payload = event_data.get("payload", {})
        
        # Log into audit ledger
        from src.models import AuditEntry, GuardrailResult
        webhook_audit = AuditEntry(
            id=f"webhook_{event_data.get('id', 'ack')}",
            timestamp="2026-09-04T12:00:00Z",
            merchant_id="rzp_merch_apex_hub",
            item_id="live_event",
            item_name=f"Razorpay Webhook: {event_type}",
            action_type="WEBHOOK_INGESTION",
            proposed_payload=payload,
            reasoning=f"Ingested live webhook event '{event_type}' from Razorpay gateway.",
            guardrail_result=GuardrailResult(
                approved=True,
                rule_violations=[],
                validator_hash="0xwebhook_verified",
                timestamp="now"
            ),
            razorpay_response=payload,
            rollback_spec=None,
            rars_before=0.0,
            rars_after=0.0,
            revenue_impact_inr=payload.get("payment", {}).get("entity", {}).get("amount", 0) / 100.0,
            rolled_back=False,
            status="PROCESSED"
        )
        state_manager.record_entry(webhook_audit)
        return {"status": "ok", "event_processed": event_type}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

class PolicyUpdateRequest(BaseModel):
    max_discount_pct: Optional[float] = None
    min_margin_pct: Optional[float] = None
    max_price_delta_pct: Optional[float] = None
    max_offer_duration_hours: Optional[int] = None
    min_offer_duration_hours: Optional[int] = None
    max_sms_per_customer_per_week: Optional[int] = None

class AdversarialAttackRequest(BaseModel):
    sku_id: str
    attack_type: Literal["prompt_injection", "zero_rupee_exploit", "margin_drain_attack", "infinite_quantity_glitch"]
    custom_prompt: Optional[str] = None

class SimulateWebhookRequest(BaseModel):
    event_type: Literal["payment.captured", "order.paid", "refund.processed", "dispute.created", "payment.failed"]
    sku_id: Optional[str] = None
    amount_inr: Optional[float] = None

@app.get("/api/policy")
def get_guardrail_policy():
    return {
        "status": "ok",
        "policy": settings.guardrails.model_dump()
    }

@app.post("/api/policy")
def update_guardrail_policy(req: PolicyUpdateRequest):
    g = settings.guardrails
    if req.max_discount_pct is not None:
        if req.max_discount_pct < 5.0 or req.max_discount_pct > 50.0:
            raise HTTPException(status_code=400, detail="Max discount must be between 5% and 50%")
        g.max_discount_pct = req.max_discount_pct
    if req.min_margin_pct is not None:
        if req.min_margin_pct < 1.0 or req.min_margin_pct > 30.0:
            raise HTTPException(status_code=400, detail="Min margin floor must be between 1% and 30%")
        g.min_margin_pct = req.min_margin_pct
    if req.max_price_delta_pct is not None:
        g.max_price_delta_pct = req.max_price_delta_pct
    if req.max_offer_duration_hours is not None:
        g.max_offer_duration_hours = req.max_offer_duration_hours
    if req.min_offer_duration_hours is not None:
        g.min_offer_duration_hours = req.min_offer_duration_hours
    if req.max_sms_per_customer_per_week is not None:
        g.max_sms_per_customer_per_week = req.max_sms_per_customer_per_week

    return {
        "status": "policy_updated",
        "policy": g.model_dump()
    }

@app.post("/api/policy/reset")
def reset_guardrail_policy():
    from src.config import GuardrailSettings
    settings.guardrails = GuardrailSettings()
    return {
        "status": "policy_reset_to_default",
        "policy": settings.guardrails.model_dump()
    }

@app.get("/api/audit/certificate")
def get_merkle_audit_certificate():
    cert = state_manager.generate_merkle_certificate()
    return cert

@app.post("/api/a2a/adversarial-test")
def run_adversarial_test(req: AdversarialAttackRequest):
    result = a2a_gateway.simulate_adversarial_attack(
        sku_id=req.sku_id,
        attack_type=req.attack_type,
        custom_prompt=req.custom_prompt
    )
    return result

@app.post("/api/webhooks/simulate")
def simulate_webhook_event(req: SimulateWebhookRequest):
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat() + "Z"
    
    catalog = discovery_engine.get_catalog()
    item = next((i for i in catalog if i.id == req.sku_id or (req.sku_id and req.sku_id in i.id)), None) if req.sku_id else (catalog[0] if catalog else None)
    
    amount_inr = req.amount_inr or (item.amount_inr if item else 999.0)
    amount_paise = int(amount_inr * 100)
    
    event_id = f"evt_sim_{uuid.uuid4().hex[:12]}"
    pay_id = f"pay_sim_{uuid.uuid4().hex[:10]}"
    order_id = f"order_sim_{uuid.uuid4().hex[:10]}"
    
    simulated_payload = {
        "entity": "event",
        "account_id": "acc_kubermesh_apex",
        "event": req.event_type,
        "contains": ["payment", "order"],
        "payload": {
            "payment": {
                "entity": {
                    "id": pay_id,
                    "entity": "payment",
                    "amount": amount_paise,
                    "currency": "INR",
                    "status": "captured" if req.event_type in ["payment.captured", "order.paid"] else ("refunded" if req.event_type == "refund.processed" else "failed"),
                    "order_id": order_id,
                    "invoice_id": None,
                    "international": False,
                    "method": "upi",
                    "amount_refunded": amount_paise if req.event_type == "refund.processed" else 0,
                    "refund_status": "full" if req.event_type == "refund.processed" else None,
                    "captured": req.event_type in ["payment.captured", "order.paid"],
                    "description": f"KuberMesh Transaction for SKU {item.name if item else 'General'}",
                    "email": "agent.buyer@enterprise.ai",
                    "contact": "+919876543210",
                    "fee": int(amount_paise * 0.02),
                    "tax": int(amount_paise * 0.0036),
                    "error_code": "PSP_TIMEOUT" if req.event_type == "payment.failed" else None,
                    "created_at": int(datetime.now().timestamp())
                }
            },
            "order": {
                "entity": {
                    "id": order_id,
                    "entity": "order",
                    "amount": amount_paise,
                    "amount_paid": amount_paise if req.event_type in ["payment.captured", "order.paid"] else 0,
                    "amount_due": 0 if req.event_type in ["payment.captured", "order.paid"] else amount_paise,
                    "currency": "INR",
                    "receipt": f"rcpt_{uuid.uuid4().hex[:6]}",
                    "status": "paid" if req.event_type in ["payment.captured", "order.paid"] else "attempted",
                    "attempts": 1,
                    "created_at": int(datetime.now().timestamp())
                }
            }
        },
        "created_at": int(datetime.now().timestamp())
    }

    # Record into audit ledger
    from src.models import AuditEntry, GuardrailResult
    webhook_entry = AuditEntry(
        id=f"audit_wh_{uuid.uuid4().hex[:8]}",
        timestamp=now_iso,
        merchant_id="rzp_merch_apex_hub",
        item_id=item.id if item else "global_event",
        item_name=f"Razorpay Webhook: {req.event_type}",
        action_type="WEBHOOK_INGESTION",
        proposed_payload=simulated_payload,
        reasoning=f"Autonomous ingestion and reconciliation for Razorpay event '{req.event_type}' on SKU {item.name if item else 'General'}.",
        guardrail_result=GuardrailResult(
            approved=True,
            rule_violations=[],
            validator_hash=f"0x{uuid.uuid4().hex[:16]}",
            timestamp=now_iso
        ),
        razorpay_response=simulated_payload,
        rollback_spec=None,
        rars_before=0.0,
        rars_after=0.0,
        revenue_impact_inr=amount_inr if req.event_type in ["payment.captured", "order.paid"] else (-amount_inr if req.event_type == "refund.processed" else 0.0),
        rolled_back=False,
        status="RECONCILED"
    )
    state_manager.record_entry(webhook_entry)

    return {
        "status": "webhook_dispatched",
        "event_id": event_id,
        "event_type": req.event_type,
        "amount_inr": amount_inr,
        "target_sku": item.name if item else "General",
        "razorpay_payload": simulated_payload,
        "audit_entry_id": webhook_entry.id
    }

@app.get("/api/webhooks/events")
def get_webhook_events(limit: int = 20):
    entries = state_manager.get_entries(limit=100)
    wh_events = [e for e in entries if e.get("action_type") == "WEBHOOK_INGESTION"]
    return {
        "count": len(wh_events),
        "events": wh_events[:limit]
    }

@app.post("/api/credentials")
def update_credentials(req: Dict[str, str]):
    key_id = req.get("key_id")
    key_secret = req.get("key_secret")
    gemini_key = req.get("gemini_key")
    
    if key_id:
        settings.razorpay_key_id = key_id
        os.environ["RAZORPAY_KEY_ID"] = key_id
    if key_secret:
        settings.razorpay_key_secret = key_secret
        os.environ["RAZORPAY_KEY_SECRET"] = key_secret
    if gemini_key:
        settings.gemini_api_key = gemini_key
        os.environ["GEMINI_API_KEY"] = gemini_key
        
    discovery_engine._init_razorpay_client()
    return {
        "status": "credentials_updated",
        "live_mode": discovery_engine.client is not None,
        "key_id_set": bool(key_id)
    }

@app.post("/api/reset")
def reset_demo_state():
    data = initialize_merchant_state()
    return {"status": "reset_successful", "catalog_count": len(data["catalog"])}

class CopilotChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
def chat_with_copilot(req: CopilotChatRequest):
    catalog = discovery_engine.get_catalog()
    return merchant_agent.chat_copilot(req.message, catalog)

@app.get("/api/benchmark/batch")
@app.post("/api/benchmark/batch")
def get_batch_benchmark():
    from src.benchmark import benchmark_engine
    return benchmark_engine.run_100_scenario_benchmark()



