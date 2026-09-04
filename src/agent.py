import json
import logging
import uuid
from typing import Dict, List, Optional, Tuple, Any
from src.config import settings
from src.models import (
    Item,
    ItemProfile,
    RARSScore,
    CampaignAction,
    GuardrailResult
)
from src.validator import safety_validator

logger = logging.getLogger("kubermesh.agent")

try:
    import google.generativeai as genai
    if settings.gemini_api_key:
        genai.configure(api_key=settings.gemini_api_key)
        _gemini_available = True
    else:
        _gemini_available = False
except Exception:
    _gemini_available = False

SUPERVISOR_SYSTEM_PROMPT = """
You are KuberMesh Supervisor, an autonomous revenue optimization agent for Indian merchants using Razorpay.
Your goal is to analyze catalog health metrics, identify revenue leakage (RARS), and select ONE bounded financial intervention.

AVAILABLE TOOLS:
1. create_discount_offer: { "discount_pct": float, "duration_hours": int, "max_redemptions": int }
   - Best for high cart abandonment (RARS 0.60-0.80) with healthy margin.
2. create_upsell_bundle: { "secondary_sku": str, "bundle_discount_pct": float }
   - Best for moderate abandonment or complementary accessory attachment.
3. send_recovery_sequence: { "target_customer_ids": list[str], "incentive_discount_pct": float, "channel": "whatsapp_sms" }
   - Best for urgent cart drop-offs (RARS > 0.70).
4. adjust_item_price: { "new_amount_paise": int }
   - Best for stagnant inventory without sales in 14+ days.

FINANCIAL GUARDRAILS (STRICT):
- MAX_DISCOUNT_PCT: 20.0%
- MIN_MARGIN_PCT: 8.0%
- MAX_PRICE_DELTA: 15.0%

Output JSON ONLY with keys: tool_name, parameters, reasoning, estimated_recovery_inr.
"""

class MerchantAgent:
    def __init__(self):
        self.model = None
        if _gemini_available and settings.gemini_api_key:
            try:
                self.model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini model: {e}")

    def propose_intervention(
        self,
        item: Item,
        profile: ItemProfile,
        score: RARSScore,
        catalog: List[Item],
        force_scenario: str = "none"
    ) -> CampaignAction:
        action_id = f"act_{uuid.uuid4().hex[:8]}"

        # Scenario 1: Discount Cap Breach (Propose 25% > 20% cap)
        if force_scenario == "discount_cap_breach":
            return CampaignAction(
                action_id=action_id,
                action_type="create_discount_offer",
                target_item_id=item.id,
                item_name=item.name,
                payload={
                    "discount_pct": 25.0,
                    "duration_hours": 48,
                    "max_redemptions": 100
                },
                reasoning=f"Critical RARS ({score.score:.2f}) detected. Proposing aggressive 25% flash discount to immediately clear abandonment backlogs.",
                estimated_recovery_inr=round(score.revenue_at_risk_inr * 0.45, 2),
                status="proposed"
            )

        # Scenario 2: Margin Floor Breach (Proposing 10% discount on low 11.4% margin SKU)
        elif force_scenario == "margin_floor_breach":
            return CampaignAction(
                action_id=action_id,
                action_type="create_discount_offer",
                target_item_id=item.id,
                item_name=item.name,
                payload={
                    "discount_pct": 10.0,
                    "duration_hours": 24,
                    "max_redemptions": 50
                },
                reasoning=f"Attempting 10% discount on '{item.name}'. (Warning: base margin is only {item.base_margin_pct:.1f}%).",
                estimated_recovery_inr=round(score.revenue_at_risk_inr * 0.30, 2),
                status="proposed"
            )

        # Scenario 3: Price Volatility Breach (Proposing 30% price reduction > 15% cap)
        elif force_scenario == "volatility_breach":
            new_amount = int(item.amount * 0.70)
            return CampaignAction(
                action_id=action_id,
                action_type="adjust_item_price",
                target_item_id=item.id,
                item_name=item.name,
                payload={
                    "new_amount_paise": new_amount
                },
                reasoning=f"Proposing deep 30% price drop from ₹{item.amount_inr:.0f} to ₹{new_amount/100:.0f} to liquidate stagnant inventory.",
                estimated_recovery_inr=round(score.revenue_at_risk_inr * 0.50, 2),
                status="proposed"
            )

        # Normal Bounded Operation
        if profile.cart_abandonment_rate >= 0.60:
            discount = min(15.0, max(5.0, item.base_margin_pct - 10.0))
            return CampaignAction(
                action_id=action_id,
                action_type="create_discount_offer",
                target_item_id=item.id,
                item_name=item.name,
                payload={
                    "discount_pct": discount,
                    "duration_hours": 48,
                    "max_redemptions": 75
                },
                reasoning=f"Cart abandonment is {profile.cart_abandonment_rate*100:.1f}%. A bounded {discount:.1f}% offer captures price-sensitive abandoners while preserving {item.base_margin_pct - discount:.1f}% profit margin.",
                estimated_recovery_inr=round(score.revenue_at_risk_inr * 0.55, 2),
                status="proposed"
            )
        elif profile.stagnation_days >= 14:
            new_amount_paise = int(item.amount * 0.92)
            return CampaignAction(
                action_id=action_id,
                action_type="adjust_item_price",
                target_item_id=item.id,
                item_name=item.name,
                payload={"new_amount_paise": new_amount_paise},
                reasoning=f"Inventory has stagnated for {profile.stagnation_days} days. Calibrating price from ₹{item.amount_inr:.0f} to ₹{new_amount_paise/100:.0f} (8% reduction) to trigger algorithmic demand pickup.",
                estimated_recovery_inr=round(score.revenue_at_risk_inr * 0.40, 2),
                status="proposed"
            )
        else:
            accessory = next((i for i in catalog if i.id != item.id and i.category in ["accessories", "general"]), catalog[0])
            return CampaignAction(
                action_id=action_id,
                action_type="create_upsell_bundle",
                target_item_id=item.id,
                item_name=item.name,
                payload={
                    "secondary_sku": accessory.id,
                    "bundle_discount_pct": 10.0
                },
                reasoning=f"Attaching complementary SKU '{accessory.name}' with a 10% combined bundle discount to elevate Average Order Value (AOV).",
                estimated_recovery_inr=round(score.revenue_at_risk_inr * 0.35, 2),
                status="proposed"
            )

    def run_bounded_optimization_cycle(
        self,
        item: Item,
        profile: ItemProfile,
        score: RARSScore,
        catalog: List[Item],
        force_scenario: str = "none"
    ) -> Dict[str, Any]:
        catalog_map = {i.id: i for i in catalog}
        decision_trace: List[Dict[str, Any]] = []

        initial_action = self.propose_intervention(
            item, profile, score, catalog, force_scenario=force_scenario
        )
        
        secondary_item = None
        if "secondary_sku" in initial_action.payload:
            secondary_item = catalog_map.get(initial_action.payload["secondary_sku"])

        guardrail_result = safety_validator.validate_action(
            initial_action, item, profile, secondary_item=secondary_item
        )
        initial_action.guardrail_result = guardrail_result

        decision_trace.append({
            "stage": "INITIAL_PROPOSAL",
            "action": initial_action.model_dump(),
            "guardrail_verdict": "APPROVED" if guardrail_result.approved else "REJECTED",
            "violations": guardrail_result.rule_violations
        })

        final_action = initial_action

        # Self-Correction Feedback Loop
        if not guardrail_result.approved:
            corrected_action = self._repair_action(initial_action, item, profile, guardrail_result, catalog)
            
            sec_item = None
            if "secondary_sku" in corrected_action.payload:
                sec_item = catalog_map.get(corrected_action.payload["secondary_sku"])

            corrected_guardrail = safety_validator.validate_action(
                corrected_action, item, profile, secondary_item=sec_item
            )
            corrected_action.guardrail_result = corrected_guardrail
            corrected_action.status = "approved" if corrected_guardrail.approved else "rejected"
            
            decision_trace.append({
                "stage": "SELF_CORRECTION_REPAIR",
                "original_violations": guardrail_result.rule_violations,
                "repaired_action": corrected_action.model_dump(),
                "guardrail_verdict": "APPROVED" if corrected_guardrail.approved else "REJECTED",
                "violations": corrected_guardrail.rule_violations
            })
            
            final_action = corrected_action
        else:
            final_action.status = "approved"

        # Compute Unit Economics
        base_margin = item.base_margin_pct
        effective_discount = final_action.payload.get("discount_pct", final_action.payload.get("bundle_discount_pct", 0.0))
        post_discount_margin = max(0.0, base_margin - effective_discount)
        breakeven_multiplier = round((base_margin / post_discount_margin), 2) if post_discount_margin > 0 else 1.0

        unit_economics = {
            "base_margin_pct": base_margin,
            "effective_discount_pct": effective_discount,
            "post_discount_margin_pct": round(post_discount_margin, 2),
            "breakeven_volume_multiplier": breakeven_multiplier,
            "net_gmv_recovery_inr": final_action.estimated_recovery_inr
        }

        return {
            "item_id": item.id,
            "item_name": item.name,
            "rars_score": score.score,
            "initial_action": initial_action,
            "final_action": final_action,
            "unit_economics": unit_economics,
            "graceful_failure_handled": not initial_action.guardrail_result.approved and final_action.guardrail_result.approved,
            "decision_trace": decision_trace
        }

    def _repair_action(
        self,
        failed_action: CampaignAction,
        item: Item,
        profile: ItemProfile,
        rejection: GuardrailResult,
        catalog: List[Item]
    ) -> CampaignAction:
        """
        Deterministic self-correction logic when guardrails are triggered.
        Adjusts parameters to fit within the merchant's financial safety envelope.
        """
        payload = dict(failed_action.payload)
        repaired_reasoning = f"Self-Correction: Validator rejected initial proposal due to [{', '.join(rejection.rule_violations)}]. "

        if failed_action.action_type == "create_discount_offer":
            # Auto-clamp discount to maximum allowable margin or 14%
            max_safe_discount = min(settings.guardrails.max_discount_pct, max(5.0, item.base_margin_pct - settings.guardrails.min_margin_pct))
            payload["discount_pct"] = round(max_safe_discount, 1)
            payload["duration_hours"] = min(payload.get("duration_hours", 48), settings.guardrails.max_offer_duration_hours)
            repaired_reasoning += f"Recalibrated discount from {failed_action.payload.get('discount_pct')}% down to {max_safe_discount:.1f}%, restoring post-discount margin to {item.base_margin_pct - max_safe_discount:.1f}% (>= {settings.guardrails.min_margin_pct}% required floor)."

        elif failed_action.action_type == "adjust_item_price":
            # Clamp delta to 12%
            payload["new_amount_paise"] = int(item.amount * 0.90)
            repaired_reasoning += "Recalibrated price drop to 10.0% to strictly respect volatility caps."

        return CampaignAction(
            action_id=f"{failed_action.action_id}_repaired",
            action_type=failed_action.action_type,
            target_item_id=item.id,
            item_name=item.name,
            payload=payload,
            reasoning=repaired_reasoning,
            estimated_recovery_inr=round(failed_action.estimated_recovery_inr * 0.85, 2),
            status="proposed"
        )

merchant_agent = MerchantAgent()
