import pytest
from src.config import settings
from src.models import Item, ItemProfile, CampaignAction, A2ANegotiationRequest
from src.seed_data import generate_seed_catalog, generate_seed_transactions, initialize_merchant_state
from src.discover import discovery_engine
from src.profiler import profiler_engine
from src.scorer import scoring_engine
from src.validator import safety_validator
from src.agent import merchant_agent
from src.executor import execution_engine
from src.rollback import rollback_engine
from src.state_manager import state_manager
from src.a2a_gateway import a2a_gateway

@pytest.fixture(autouse=True)
def setup_test_state():
    initialize_merchant_state()

def test_catalog_and_seed_generation():
    catalog = generate_seed_catalog()
    assert len(catalog) >= 6
    earbuds = next(i for i in catalog if i.id == "item_earbuds_pro")
    assert earbuds.amount == 149900
    assert earbuds.base_margin_pct > 30.0

def test_profiler_metrics_computation():
    catalog = discovery_engine.get_catalog()
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()

    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    assert "item_earbuds_pro" in profiles
    eb_profile = profiles["item_earbuds_pro"]

    # Earbuds should have high cart abandonment in seed data
    assert eb_profile.cart_abandonment_rate > 0.50
    assert eb_profile.total_orders_created >= 30

def test_rars_scoring_formula():
    catalog = discovery_engine.get_catalog()
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()

    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    scores = scoring_engine.score_all(profiles)

    assert "item_earbuds_pro" in scores
    eb_score = scores["item_earbuds_pro"]
    assert 0.0 <= eb_score.score <= 1.0
    assert eb_score.risk_level in ["HIGH", "CRITICAL"]
    assert eb_score.revenue_at_risk_inr > 0

def test_guardrail_rejection_on_excessive_discount():
    catalog = discovery_engine.get_catalog()
    earbuds = next(i for i in catalog if i.id == "item_earbuds_pro")
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)

    action = CampaignAction(
        action_id="act_test_fail",
        action_type="create_discount_offer",
        target_item_id=earbuds.id,
        item_name=earbuds.name,
        payload={"discount_pct": 25.0, "duration_hours": 48, "max_redemptions": 50},
        reasoning="Testing guardrail violation",
        estimated_recovery_inr=1000.0
    )

    result = safety_validator.validate_action(action, earbuds, profiles[earbuds.id])
    assert result.approved is False
    assert any("Discount 25.0% exceeds" in v for v in result.rule_violations)

def test_guardrail_rejection_on_margin_floor_breach():
    catalog = discovery_engine.get_catalog()
    # Mechanical keyboard has 11.4% base margin
    kb = next(i for i in catalog if i.id == "item_mechanical_keyboard")
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)

    # 10% discount on 11.4% margin leaves 1.4% margin (< 8% minimum)
    action = CampaignAction(
        action_id="act_margin_fail",
        action_type="create_discount_offer",
        target_item_id=kb.id,
        item_name=kb.name,
        payload={"discount_pct": 10.0, "duration_hours": 24, "max_redemptions": 30},
        reasoning="Testing margin breach",
        estimated_recovery_inr=500.0
    )

    result = safety_validator.validate_action(action, kb, profiles[kb.id])
    assert result.approved is False
    assert any("below mandatory safety floor" in v for v in result.rule_violations)

def test_graceful_failure_and_self_correction_cycle():
    catalog = discovery_engine.get_catalog()
    earbuds = next(i for i in catalog if i.id == "item_earbuds_pro")
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)
    scores = scoring_engine.score_all(profiles)

    # Force a failure scenario to demonstrate self-correction
    cycle = merchant_agent.run_bounded_optimization_cycle(
        earbuds, profiles[earbuds.id], scores[earbuds.id], catalog, demonstrate_graceful_failure=True
    )

    assert cycle["graceful_failure_handled"] is True
    assert cycle["initial_action"].guardrail_result.approved is False
    assert cycle["final_action"].guardrail_result.approved is True
    assert cycle["final_action"].payload["discount_pct"] <= 20.0

def test_execution_and_rollback():
    catalog = discovery_engine.get_catalog()
    earbuds = next(i for i in catalog if i.id == "item_earbuds_pro")
    orders = discovery_engine.get_orders()
    payments = discovery_engine.get_payments()
    profiles = profiler_engine.profile_catalog(catalog, orders, payments)

    action = CampaignAction(
        action_id="act_exec_test",
        action_type="create_discount_offer",
        target_item_id=earbuds.id,
        item_name=earbuds.name,
        payload={"discount_pct": 12.0, "duration_hours": 48, "max_redemptions": 50},
        reasoning="Safe promotional offer",
        estimated_recovery_inr=2000.0
    )
    action.guardrail_result = safety_validator.validate_action(action, earbuds, profiles[earbuds.id])
    assert action.guardrail_result.approved is True

    # Execute
    executed = execution_engine.execute_action(action, earbuds)
    assert executed.status == "executed"
    assert "offer_id" in executed.razorpay_response

    # Verify state has offer
    state = discovery_engine._load_local_state()
    assert len(state["active_offers"]) > 0

    # Record into audit ledger
    from src.models import AuditEntry
    entry = AuditEntry(
        id="audit_test_123",
        timestamp="2026-09-04T12:00:00Z",
        merchant_id="rzp_test_merch",
        item_id=earbuds.id,
        item_name=earbuds.name,
        action_type=executed.action_type,
        proposed_payload=executed.payload,
        reasoning=executed.reasoning,
        guardrail_result=executed.guardrail_result,
        razorpay_response=executed.razorpay_response,
        rollback_spec=executed.rollback_spec,
        rars_before=0.75,
        rars_after=0.30,
        revenue_impact_inr=2000.0,
        rolled_back=False,
        status="EXECUTED"
    )
    state_manager.record_entry(entry)

    # Rollback
    rollback_res = rollback_engine.trigger_rollback("audit_test_123")
    assert rollback_res["success"] is True

    # Verify offer is removed from state
    state_after = discovery_engine._load_local_state()
    assert len(state_after["active_offers"]) == 0

def test_a2a_negotiation_handshake():
    # 1. Valid offer above floor price -> ACCEPT
    req_valid = A2ANegotiationRequest(
        buyer_agent_id="agent_buyer_01",
        sku="item_earbuds_pro",
        requested_quantity=1,
        offered_price_paise=135000  # ₹1350 vs Retail ₹1499 (Floor is ~₹1032)
    )
    res_valid = a2a_gateway.handle_negotiation(req_valid)
    assert res_valid.decision == "ACCEPTED"
    assert res_valid.razorpay_order_id.startswith("order_a2a_")
    assert res_valid.signature_token.startswith("0x")

    # 2. Predatory offer below floor price -> REJECT
    req_low = A2ANegotiationRequest(
        buyer_agent_id="agent_buyer_02",
        sku="item_earbuds_pro",
        requested_quantity=1,
        offered_price_paise=50000  # ₹500 vs Cost ₹950
    )
    res_low = a2a_gateway.handle_negotiation(req_low)
    assert res_low.decision == "REJECTED"
