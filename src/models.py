from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional, Any
from pydantic import BaseModel, Field

class Item(BaseModel):
    id: str
    name: str
    description: str = ""
    amount: int  # in paise (e.g. 129900 = ₹1299.00)
    currency: str = "INR"
    base_cost_paise: int  # COGS for margin calculations
    stock: int = 50
    category: str = "general"
    active: bool = True
    created_at: Optional[str] = None

    @property
    def amount_inr(self) -> float:
        return self.amount / 100.0

    @property
    def base_cost_inr(self) -> float:
        return self.base_cost_paise / 100.0

    @property
    def base_margin_pct(self) -> float:
        if self.amount <= 0:
            return 0.0
        return round(((self.amount - self.base_cost_paise) / self.amount) * 100.0, 2)

class Order(BaseModel):
    id: str
    item_id: str
    amount: int  # paise
    currency: str = "INR"
    status: Literal["created", "attempted", "paid", "failed", "abandoned"]
    customer_id: str
    customer_name: str = "Shopper"
    customer_phone: str = "+919876543210"
    created_at: str
    payment_id: Optional[str] = None

class Payment(BaseModel):
    id: str
    order_id: str
    amount: int  # paise
    currency: str = "INR"
    status: Literal["captured", "failed"]
    method: str = "upi"
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    created_at: str

class ItemProfile(BaseModel):
    item_id: str
    item_name: str
    amount_inr: float
    stock: int
    base_margin_pct: float
    sales_velocity_7d: float  # paid orders per day
    cart_abandonment_rate: float  # 0.0 to 1.0
    stagnation_days: int  # days since last sale
    payment_failure_rate: float  # 0.0 to 1.0
    total_orders_created: int
    total_orders_paid: int
    total_orders_failed: int
    total_orders_abandoned: int

class RARSBreakdown(BaseModel):
    cart_abandonment_component: float
    velocity_deficit_component: float
    stagnation_component: float
    payment_failure_component: float

class RARSScore(BaseModel):
    item_id: str
    item_name: str
    score: float  # 0.00 to 1.00
    risk_level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
    revenue_at_risk_inr: float
    breakdown: RARSBreakdown
    suggested_strategy: str

class GuardrailResult(BaseModel):
    approved: bool
    rule_violations: List[str] = Field(default_factory=list)
    sanitized_payload: Optional[Dict[str, Any]] = None
    validator_hash: str
    timestamp: str

class CampaignAction(BaseModel):
    action_id: str
    action_type: Literal["create_discount_offer", "create_upsell_bundle", "send_recovery_sequence", "adjust_item_price"]
    target_item_id: str
    item_name: str
    payload: Dict[str, Any]
    reasoning: str
    estimated_recovery_inr: float
    status: Literal["proposed", "rejected", "approved", "executed", "rolled_back"] = "proposed"
    guardrail_result: Optional[GuardrailResult] = None
    razorpay_response: Optional[Dict[str, Any]] = None
    rollback_spec: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat() + "Z")

class AuditEntry(BaseModel):
    id: str
    timestamp: str
    merchant_id: str
    item_id: str
    item_name: str
    action_type: str
    proposed_payload: Dict[str, Any]
    reasoning: str
    guardrail_result: GuardrailResult
    razorpay_response: Optional[Dict[str, Any]] = None
    rollback_spec: Optional[Dict[str, Any]] = None
    rars_before: float
    rars_after: Optional[float] = None
    revenue_impact_inr: float
    rolled_back: bool = False
    status: str

# Protocol / Agent-to-Agent (A2A) schemas
class A2ANegotiationRequest(BaseModel):
    buyer_agent_id: str
    sku: str
    requested_quantity: int = 1
    offered_price_paise: int
    preferred_payment_method: str = "upi"
    max_delivery_sla_hours: int = 48

class A2ANegotiationResponse(BaseModel):
    decision: Literal["ACCEPTED", "COUNTER_OFFER", "REJECTED"]
    sku: str
    quantity: int
    agreed_price_paise: int
    total_amount_paise: int
    discount_applied_pct: float
    razorpay_order_id: Optional[str] = None
    payment_link: Optional[str] = None
    fulfillment_sla_hours: int
    signature_token: str
    reason: str
