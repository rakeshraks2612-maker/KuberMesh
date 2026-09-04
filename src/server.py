import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.config import settings
from src.models import (
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

class OptimizeRequest(BaseModel):
    item_id: Optional[str] = None
    demonstrate_failure: bool = False

class RollbackRequest(BaseModel):
    entry_id: str

@app.get("/", response_class=HTMLResponse)
def serve_dashboard():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>KuberMesh Backend Active. Place static dashboard in /static/index.html</h1>"

@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "guardrails": settings.guardrails.model_dump(),
        "razorpay_mode": "test_mode" if discovery_engine.client else "synthetic_container"
    }

@app.get("/api/catalog")
def get_catalog_and_scores():
    catalog = discovery_engine.get_catalog()
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    scores = scoring_engine.score_all(profiles)
    
    combined = []
    total_leakage = 0.0
    for item in catalog:
        prof = profiles.get(item.id)
        sc = scores.get(item.id)
        if sc:
            total_leakage += sc.revenue_at_risk_inr
        combined.append({
            "item": item.model_dump(),
            "profile": prof.model_dump() if prof else None,
            "rars": sc.model_dump() if sc else None
        })
        
    return {
        "count": len(catalog),
        "total_revenue_at_risk_inr": round(total_leakage, 2),
        "items": combined
    }

@app.post("/api/scan")
def run_scan():
    catalog = discovery_engine.get_catalog()
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    scores = scoring_engine.score_all(profiles)
    
    # Sort items by highest RARS score
    sorted_items = sorted(catalog, key=lambda x: scores.get(x.id).score if scores.get(x.id) else 0.0, reverse=True)
    
    return {
        "scanned_items_count": len(catalog),
        "total_orders_analyzed": len(orders),
        "top_risk_sku": sorted_items[0].id if sorted_items else None,
        "top_risk_score": scores.get(sorted_items[0].id).score if sorted_items and scores.get(sorted_items[0].id) else 0.0,
        "timestamp": "now"
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
        # Default to highest RARS score
        sorted_catalog = sorted(catalog, key=lambda x: scores.get(x.id).score if scores.get(x.id) else 0.0, reverse=True)
        target_item = sorted_catalog[0]

    profile = profiles[target_item.id]
    score = scores[target_item.id]

    cycle_result = merchant_agent.run_bounded_optimization_cycle(
        target_item, profile, score, catalog, demonstrate_graceful_failure=req.demonstrate_failure
    )

    final_action: CampaignAction = cycle_result["final_action"]
    
    # Execute approved action
    if final_action.status == "approved":
        executed_action = execution_engine.execute_action(final_action, target_item)
        
        # Record into immutable audit ledger
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
            rars_after=round(max(0.15, score.score - 0.45), 2),
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

@app.post("/api/reset")
def reset_demo_state():
    data = initialize_merchant_state()
    return {"status": "reset_successful", "catalog_count": len(data["catalog"])}
