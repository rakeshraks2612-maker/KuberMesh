from typing import Dict, List
from src.config import settings
from src.models import ItemProfile, RARSScore, RARSBreakdown

class ScoringEngine:
    def __init__(self):
        self.w_car = 0.35       # Cart Abandonment weight
        self.w_velocity = 0.25  # Sales Velocity Deficit weight
        self.w_stag = 0.20      # Stagnation weight
        self.w_pfr = 0.20       # Payment Failure weight

    def compute_rars(self, profile: ItemProfile) -> RARSScore:
        target_v = settings.guardrails.target_velocity_7d
        
        # 1. Cart Abandonment Component (0.0 to 1.0)
        c_car = min(1.0, max(0.0, profile.cart_abandonment_rate))
        
        # 2. Velocity Deficit Component (1 - actual/target)
        velocity_ratio = min(1.0, max(0.0, profile.sales_velocity_7d / target_v))
        c_vel = 1.0 - velocity_ratio
        
        # 3. Stagnation Component (stagnation_days / 30)
        c_stag = min(1.0, max(0.0, profile.stagnation_days / 30.0))
        
        # 4. Payment Failure Component
        c_pfr = min(1.0, max(0.0, profile.payment_failure_rate))
        
        raw_score = (
            self.w_car * c_car +
            self.w_velocity * c_vel +
            self.w_stag * c_stag +
            self.w_pfr * c_pfr
        )
        score = round(min(1.0, max(0.0, raw_score)), 4)
        
        # Risk classification
        if score >= 0.60:
            risk_level = "CRITICAL"
            suggested_strategy = "Targeted Recovery Sequence or Emergency Discount Offer"
        elif score >= 0.40:
            risk_level = "HIGH"
            suggested_strategy = "Promotional Offer or Cross-Sell Bundle"
        elif score >= 0.20:
            risk_level = "MODERATE"
            suggested_strategy = "Catalog Optimization or Bundle Packaging"
        else:
            risk_level = "LOW"
            suggested_strategy = "Healthy Benchmark — Maintain Organic Flow"
            
        # Estimated revenue at risk in INR
        abandonment_loss = profile.total_orders_abandoned * profile.amount_inr
        failure_loss = profile.total_orders_failed * profile.amount_inr
        stagnant_holding_loss = (profile.stock * profile.amount_inr) * 0.15 if profile.stagnation_days > 14 else 0.0
        revenue_at_risk_inr = round(abandonment_loss + failure_loss + stagnant_holding_loss, 2)
        
        return RARSScore(
            item_id=profile.item_id,
            item_name=profile.item_name,
            score=score,
            risk_level=risk_level,
            revenue_at_risk_inr=revenue_at_risk_inr,
            breakdown=RARSBreakdown(
                cart_abandonment_component=round(self.w_car * c_car, 4),
                velocity_deficit_component=round(self.w_velocity * c_vel, 4),
                stagnation_component=round(self.w_stag * c_stag, 4),
                payment_failure_component=round(self.w_pfr * c_pfr, 4)
            ),
            suggested_strategy=suggested_strategy
        )

    def score_all(self, profiles: Dict[str, ItemProfile]) -> Dict[str, RARSScore]:
        return {item_id: self.compute_rars(p) for item_id, p in profiles.items()}

scoring_engine = ScoringEngine()
