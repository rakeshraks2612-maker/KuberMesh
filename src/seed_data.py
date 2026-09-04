import json
from datetime import datetime, timedelta, timezone
import random
from typing import Dict, List, Any
from src.config import settings
from src.models import Item, Order, Payment

def generate_seed_catalog() -> List[Item]:
    return [
        Item(
            id="item_earbuds_pro",
            name="AuraSound Pro ANC Earbuds",
            description="Active Noise Cancelling True Wireless Earbuds with 32hr Battery",
            amount=149900,  # ₹1,499.00
            base_cost_paise=95000,  # ₹950.00 (36.6% margin)
            stock=85,
            category="electronics",
            active=True
        ),
        Item(
            id="item_earbud_case",
            name="AuraSound Armour Silicone Case",
            description="Shockproof protective silicone case with carabiner clip",
            amount=39900,  # ₹399.00
            base_cost_paise=15000,  # ₹150.00 (62.4% margin)
            stock=140,
            category="accessories",
            active=True
        ),
        Item(
            id="item_smartwatch_elite",
            name="Chronos AMOLED Smartwatch",
            description="1.43-inch AMOLED Display with Bluetooth Calling & SpO2 Monitor",
            amount=299900,  # ₹2,999.00
            base_cost_paise=195000,  # ₹1,950.00 (35.0% margin)
            stock=45,
            category="electronics",
            active=True
        ),
        Item(
            id="item_fast_charger_65w",
            name="VoltPulse 65W GaN Dual-Port Charger",
            description="Ultra-compact GaN fast charger with PD 3.0 & PPS support",
            amount=119900,  # ₹1,199.00
            base_cost_paise=70000,  # ₹700.00 (41.6% margin)
            stock=120,
            category="accessories",
            active=True
        ),
        Item(
            id="item_mechanical_keyboard",
            name="VortexRGB Mechanical Keyboard",
            description="Hot-swappable tactile blue switches with per-key RGB backlighting",
            amount=349900,  # ₹3,499.00
            base_cost_paise=310000,  # ₹3,100.00 (11.4% margin - LOW MARGIN TRAP)
            stock=30,
            category="gaming",
            active=True
        ),
        Item(
            id="item_leather_backpack",
            name="Vanguard Urban Leather Backpack",
            description="Water-resistant full-grain leather laptop backpack (15.6 inch)",
            amount=429900,  # ₹4,299.00
            base_cost_paise=260000,  # ₹2,600.00 (39.5% margin)
            stock=22,
            category="fashion",
            active=True
        ),
        Item(
            id="item_braided_cable",
            name="VoltPulse 100W Braided Type-C Cable",
            description="2-meter heavy-duty nylon braided fast charge & sync cable",
            amount=29900,  # ₹299.00
            base_cost_paise=11000,  # ₹110.00 (63.2% margin)
            stock=200,
            category="accessories",
            active=True
        )
    ]

def generate_seed_transactions(catalog: List[Item]) -> Dict[str, Any]:
    random.seed(42)  # Deterministic seed for reproducible testing & demo
    now = datetime.now(timezone.utc)
    
    orders: List[Order] = []
    payments: List[Payment] = []
    
    # 1. AuraSound Pro ANC Earbuds -> Severe Cart Abandonment Profile
    earbuds = next(i for i in catalog if i.id == "item_earbuds_pro")
    for idx in range(35):
        dt = (now - timedelta(days=random.randint(0, 5), hours=random.randint(1, 23))).isoformat() + "Z"
        order_id = f"order_eb_{idx+1000}"
        cust_id = f"cust_eb_{idx+100}"
        
        # 74% Abandonment rate
        if idx < 9:
            status = "paid"
            pay_id = f"pay_eb_{idx+2000}"
            orders.append(Order(id=order_id, item_id=earbuds.id, amount=earbuds.amount, status=status, customer_id=cust_id, customer_phone=f"+9198110{idx:05d}", created_at=dt, payment_id=pay_id))
            payments.append(Payment(id=pay_id, order_id=order_id, amount=earbuds.amount, status="captured", method="upi", created_at=dt))
        elif idx < 12:
            status = "failed"
            pay_id = f"pay_eb_{idx+2000}"
            orders.append(Order(id=order_id, item_id=earbuds.id, amount=earbuds.amount, status=status, customer_id=cust_id, customer_phone=f"+9198110{idx:05d}", created_at=dt, payment_id=pay_id))
            payments.append(Payment(id=pay_id, order_id=order_id, amount=earbuds.amount, status="failed", method="card", error_code="GATEWAY_TIMEOUT", error_description="Bank gateway timeout", created_at=dt))
        else:
            status = "abandoned"
            orders.append(Order(id=order_id, item_id=earbuds.id, amount=earbuds.amount, status=status, customer_id=cust_id, customer_phone=f"+9198110{idx:05d}", created_at=dt))

    # 2. Vanguard Urban Leather Backpack -> Inventory Stagnation Profile (No sales in 19 days)
    backpack = next(i for i in catalog if i.id == "item_leather_backpack")
    for idx in range(6):
        dt = (now - timedelta(days=19 + random.randint(1, 10))).isoformat() + "Z"
        order_id = f"order_bp_{idx+1000}"
        cust_id = f"cust_bp_{idx+100}"
        pay_id = f"pay_bp_{idx+2000}"
        orders.append(Order(id=order_id, item_id=backpack.id, amount=backpack.amount, status="paid", customer_id=cust_id, customer_phone=f"+9198220{idx:05d}", created_at=dt, payment_id=pay_id))
        payments.append(Payment(id=pay_id, order_id=order_id, amount=backpack.amount, status="captured", method="upi", created_at=dt))

    # 3. Chronos Smartwatch -> High Payment Failure Rate (UPI declines)
    smartwatch = next(i for i in catalog if i.id == "item_smartwatch_elite")
    for idx in range(24):
        dt = (now - timedelta(days=random.randint(0, 6))).isoformat() + "Z"
        order_id = f"order_sw_{idx+1000}"
        cust_id = f"cust_sw_{idx+100}"
        pay_id = f"pay_sw_{idx+2000}"
        if idx < 12:
            status = "paid"
            orders.append(Order(id=order_id, item_id=smartwatch.id, amount=smartwatch.amount, status=status, customer_id=cust_id, customer_phone=f"+9198330{idx:05d}", created_at=dt, payment_id=pay_id))
            payments.append(Payment(id=pay_id, order_id=order_id, amount=smartwatch.amount, status="captured", method="upi", created_at=dt))
        elif idx < 20:
            status = "failed"
            orders.append(Order(id=order_id, item_id=smartwatch.id, amount=smartwatch.amount, status=status, customer_id=cust_id, customer_phone=f"+9198330{idx:05d}", created_at=dt, payment_id=pay_id))
            payments.append(Payment(id=pay_id, order_id=order_id, amount=smartwatch.amount, status="failed", method="upi", error_code="PSP_BANK_DECLINED", error_description="Issuer bank declined transaction", created_at=dt))
        else:
            status = "abandoned"
            orders.append(Order(id=order_id, item_id=smartwatch.id, amount=smartwatch.amount, status=status, customer_id=cust_id, customer_phone=f"+9198330{idx:05d}", created_at=dt))

    # 4. VoltPulse 65W GaN Charger -> Healthy Benchmark (High velocity, low drop-off)
    charger = next(i for i in catalog if i.id == "item_fast_charger_65w")
    for idx in range(28):
        dt = (now - timedelta(days=random.randint(0, 4))).isoformat() + "Z"
        order_id = f"order_ch_{idx+1000}"
        cust_id = f"cust_ch_{idx+100}"
        pay_id = f"pay_ch_{idx+2000}"
        if idx < 24:
            status = "paid"
            orders.append(Order(id=order_id, item_id=charger.id, amount=charger.amount, status=status, customer_id=cust_id, customer_phone=f"+9198440{idx:05d}", created_at=dt, payment_id=pay_id))
            payments.append(Payment(id=pay_id, order_id=order_id, amount=charger.amount, status="captured", method="upi", created_at=dt))
        else:
            status = "abandoned"
            orders.append(Order(id=order_id, item_id=charger.id, amount=charger.amount, status=status, customer_id=cust_id, customer_phone=f"+9198440{idx:05d}", created_at=dt))

    # 5. VortexRGB Mechanical Keyboard -> Low Margin Item
    kb = next(i for i in catalog if i.id == "item_mechanical_keyboard")
    for idx in range(12):
        dt = (now - timedelta(days=random.randint(1, 7))).isoformat() + "Z"
        order_id = f"order_kb_{idx+1000}"
        cust_id = f"cust_kb_{idx+100}"
        pay_id = f"pay_kb_{idx+2000}"
        if idx < 4:
            status = "paid"
            orders.append(Order(id=order_id, item_id=kb.id, amount=kb.amount, status=status, customer_id=cust_id, customer_phone=f"+9198550{idx:05d}", created_at=dt, payment_id=pay_id))
            payments.append(Payment(id=pay_id, order_id=order_id, amount=kb.amount, status="captured", method="card", created_at=dt))
        else:
            status = "abandoned"
            orders.append(Order(id=order_id, item_id=kb.id, amount=kb.amount, status=status, customer_id=cust_id, customer_phone=f"+9198550{idx:05d}", created_at=dt))

    return {
        "catalog": [item.model_dump() for item in catalog],
        "orders": [order.model_dump() for order in orders],
        "payments": [payment.model_dump() for payment in payments],
        "active_offers": []
    }

def initialize_merchant_state() -> Dict[str, Any]:
    catalog = generate_seed_catalog()
    data = generate_seed_transactions(catalog)
    with open(settings.merchant_state_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return data

if __name__ == "__main__":
    initialize_merchant_state()
    print(f"✅ Seeded merchant state generated at {settings.merchant_state_path}")
