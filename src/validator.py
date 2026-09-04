import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from src.config import settings
from src.models import CampaignAction, Item, ItemProfile, GuardrailResult

class SafetyValidator:
    """
    Deterministic zero-LLM safety & financial validator.
    Strictly gates all autonomous money movement and price/discount alterations.
    """
    def validate_action(
        self,
        action: CampaignAction,
        item: Item,
        profile: ItemProfile,
        secondary_item: Optional[Item] = None
    ) -> GuardrailResult:
        violations: List[str] = []
        payload = action.payload
        g = settings.guardrails
        now_iso = datetime.now(timezone.utc).isoformat() + "Z"

        if action.action_type == "create_discount_offer":
            discount_pct = float(payload.get("discount_pct", 0.0))
            duration_hours = int(payload.get("duration_hours", 24))
            max_redemptions = int(payload.get("max_redemptions", 50))

            # Guardrail 1: Max discount cap
            if discount_pct > g.max_discount_pct:
                violations.append(
                    f"Guardrail G-01 Violated: Discount {discount_pct:.1f}% exceeds absolute merchant limit of {g.max_discount_pct:.1f}%."
                )

            # Guardrail 2: Minimum Net Profit Margin Floor
            effective_margin = item.base_margin_pct - discount_pct
            if effective_margin < g.min_margin_pct:
                violations.append(
                    f"Guardrail G-02 Violated: Post-discount margin {effective_margin:.1f}% falls below mandatory safety floor of {g.min_margin_pct:.1f}% (Base Margin: {item.base_margin_pct:.1f}%)."
                )

            # Guardrail 3: Offer Duration Bounds
            if duration_hours > g.max_offer_duration_hours or duration_hours < g.min_offer_duration_hours:
                violations.append(
                    f"Guardrail G-05 Violated: Offer duration {duration_hours}h outside allowable window [{g.min_offer_duration_hours}h - {g.max_offer_duration_hours}h]."
                )

            # Guardrail 4: Redemption Cap
            if max_redemptions <= 0 or max_redemptions > 500:
                violations.append(
                    f"Guardrail G-06 Violated: Redemption cap {max_redemptions} must be between 1 and 500."
                )

        elif action.action_type == "create_upsell_bundle":
            bundle_discount_pct = float(payload.get("bundle_discount_pct", 0.0))
            if bundle_discount_pct > g.max_discount_pct:
                violations.append(
                    f"Guardrail G-01 Violated: Bundle discount {bundle_discount_pct:.1f}% exceeds limit of {g.max_discount_pct:.1f}%."
                )

            if secondary_item:
                combined_retail = item.amount + secondary_item.amount
                combined_cost = item.base_cost_paise + secondary_item.base_cost_paise
                discounted_retail = combined_retail * (1.0 - (bundle_discount_pct / 100.0))
                bundle_margin_pct = ((discounted_retail - combined_cost) / discounted_retail) * 100.0 if discounted_retail > 0 else 0.0
                
                if bundle_margin_pct < g.min_margin_pct:
                    violations.append(
                        f"Guardrail G-02 Violated: Combined bundle margin {bundle_margin_pct:.1f}% falls below floor of {g.min_margin_pct:.1f}%."
                    )
            else:
                violations.append("Guardrail G-07 Violated: Secondary bundle SKU must be specified and active.")

        elif action.action_type == "send_recovery_sequence":
            customer_count = len(payload.get("target_customer_ids", []))
            if customer_count == 0:
                violations.append("Guardrail G-08 Violated: Abandoned cart recovery requires at least 1 verified recipient.")
            
            # Attached incentive discount check
            recovery_discount_pct = float(payload.get("incentive_discount_pct", 0.0))
            if recovery_discount_pct > g.max_discount_pct:
                violations.append(
                    f"Guardrail G-01 Violated: Recovery incentive discount {recovery_discount_pct:.1f}% exceeds cap of {g.max_discount_pct:.1f}%."
                )

        elif action.action_type == "adjust_item_price":
            new_amount_paise = int(payload.get("new_amount_paise", item.amount))
            delta_pct = abs(new_amount_paise - item.amount) / item.amount * 100.0
            
            if delta_pct > g.max_price_delta_pct:
                violations.append(
                    f"Guardrail G-03 Violated: Price shift {delta_pct:.1f}% exceeds single-update volatility cap of {g.max_price_delta_pct:.1f}%."
                )
                
            new_margin_pct = ((new_amount_paise - item.base_cost_paise) / new_amount_paise) * 100.0 if new_amount_paise > 0 else 0.0
            if new_margin_pct < g.min_margin_pct:
                violations.append(
                    f"Guardrail G-02 Violated: Adjusted price results in margin {new_margin_pct:.1f}% below minimum floor of {g.min_margin_pct:.1f}%."
                )

        else:
            violations.append(f"Guardrail G-00 Violated: Unrecognized action type '{action.action_type}'.")

        # Generate cryptographic verification hash for tamper-proof audit
        canonical_str = f"{action.action_type}:{item.id}:{json.dumps(payload, sort_keys=True)}:{len(violations)}"
        v_hash = "0x" + hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()[:16]

        approved = len(violations) == 0
        return GuardrailResult(
            approved=approved,
            rule_violations=violations,
            sanitized_payload=payload if approved else None,
            validator_hash=v_hash,
            timestamp=now_iso
        )

safety_validator = SafetyValidator()
