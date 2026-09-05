import json
import logging
import time
from typing import Dict, List, Any
import razorpay
from src.config import settings
from src.models import Item, Order, Payment
from src.seed_data import initialize_merchant_state

logger = logging.getLogger("kubermesh.discover")

CACHE_TTL_SECONDS = 30.0

class DiscoveryEngine:
    def __init__(self):
        self.client = None
        self._cached_catalog: List[Item] = None
        self._catalog_ts: float = 0.0
        self._cached_orders: List[Order] = None
        self._orders_ts: float = 0.0
        self._cached_payments: List[Payment] = None
        self._payments_ts: float = 0.0
        self._init_razorpay_client()
        self._ensure_merchant_state()

    def _init_razorpay_client(self):
        try:
            if settings.razorpay_key_id and settings.razorpay_key_secret and not settings.razorpay_key_id.startswith("rzp_test_kubermesh_demo"):
                self.client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
                logger.info("Razorpay live test client initialized.")
        except Exception as e:
            logger.warning(f"Could not connect live Razorpay client: {e}. Falling back to high-fidelity synthetic store.")
            self.client = None

    def _ensure_merchant_state(self):
        if not settings.merchant_state_path.exists():
            initialize_merchant_state()

    def _load_local_state(self) -> Dict[str, Any]:
        self._ensure_merchant_state()
        with open(settings.merchant_state_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_local_state(self, state: Dict[str, Any]):
        with open(settings.merchant_state_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    def get_catalog(self) -> List[Item]:
        now = time.time()
        if self._cached_catalog and (now - self._catalog_ts < CACHE_TTL_SECONDS):
            return self._cached_catalog

        # If live client is configured, we can query client.item.all()
        if self.client:
            try:
                raw_items = self.client.item.all()
                if raw_items and "items" in raw_items and len(raw_items["items"]) > 0:
                    items = []
                    for item_data in raw_items["items"]:
                        amt = item_data.get("amount", 100000)
                        items.append(Item(
                            id=item_data.get("id"),
                            name=item_data.get("name"),
                            description=item_data.get("description", ""),
                            amount=amt,
                            base_cost_paise=int(amt * 0.65),  # 35% margin assumption for live items
                            currency=item_data.get("currency", "INR"),
                            active=item_data.get("active", True)
                        ))
                    self._cached_catalog = items
                    self._catalog_ts = now
                    return items
            except Exception as e:
                logger.warning(f"Failed to fetch items from Razorpay API: {e}. Using synthetic state.")

        state = self._load_local_state()
        local_catalog = [Item(**item_dict) for item_dict in state.get("catalog", [])]
        self._cached_catalog = local_catalog
        self._catalog_ts = now
        return local_catalog

    def get_orders(self) -> List[Order]:
        now = time.time()
        if self._cached_orders and (now - self._orders_ts < CACHE_TTL_SECONDS):
            return self._cached_orders

        if self.client:
            try:
                raw_orders = self.client.order.all()
                if raw_orders and "items" in raw_orders and len(raw_orders["items"]) > 0:
                    orders = []
                    for o in raw_orders["items"]:
                        orders.append(Order(
                            id=o.get("id"),
                            item_id=o.get("notes", {}).get("item_id", "item_earbuds_pro"),
                            amount=o.get("amount", 0),
                            currency=o.get("currency", "INR"),
                            status=o.get("status", "created"),
                            customer_id=o.get("receipt", "cust_live"),
                            created_at=str(o.get("created_at"))
                        ))
                    self._cached_orders = orders
                    self._orders_ts = now
                    return orders
            except Exception as e:
                logger.warning(f"Failed to fetch orders from Razorpay API: {e}. Using synthetic state.")

        state = self._load_local_state()
        local_orders = [Order(**order_dict) for order_dict in state.get("orders", [])]
        self._cached_orders = local_orders
        self._orders_ts = now
        return local_orders

    def get_payments(self) -> List[Payment]:
        now = time.time()
        if self._cached_payments and (now - self._payments_ts < CACHE_TTL_SECONDS):
            return self._cached_payments

        if self.client:
            try:
                raw_payments = self.client.payment.all()
                if raw_payments and "items" in raw_payments and len(raw_payments["items"]) > 0:
                    payments = []
                    for p in raw_payments["items"]:
                        payments.append(Payment(
                            id=p.get("id"),
                            order_id=p.get("order_id", ""),
                            amount=p.get("amount", 0),
                            status="captured" if p.get("status") == "captured" else "failed",
                            method=p.get("method", "upi"),
                            created_at=str(p.get("created_at"))
                        ))
                    self._cached_payments = payments
                    self._payments_ts = now
                    return payments
            except Exception as e:
                logger.warning(f"Failed to fetch payments from Razorpay API: {e}. Using synthetic state.")

        state = self._load_local_state()
        local_payments = [Payment(**pay_dict) for pay_dict in state.get("payments", [])]
        self._cached_payments = local_payments
        self._payments_ts = now
        return local_payments

    def get_active_offers(self) -> List[Dict[str, Any]]:
        state = self._load_local_state()
        return state.get("active_offers", [])

discovery_engine = DiscoveryEngine()

