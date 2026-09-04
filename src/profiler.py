from datetime import datetime, timezone
from typing import Dict, List
from src.models import Item, Order, Payment, ItemProfile

def parse_iso_datetime(dt_str: str) -> datetime:
    try:
        # Handle unix timestamp or ISO strings
        if dt_str.isdigit():
            return datetime.fromtimestamp(int(dt_str), tz=timezone.utc)
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)

class ProfilerEngine:
    def profile_catalog(self, items: List[Item], orders: List[Order], payments: List[Payment]) -> Dict[str, ItemProfile]:
        profiles: Dict[str, ItemProfile] = {}
        now = datetime.now(timezone.utc)
        
        # Group orders by item
        orders_by_item: Dict[str, List[Order]] = {item.id: [] for item in items}
        for o in orders:
            if o.item_id in orders_by_item:
                orders_by_item[o.item_id].append(o)

        for item in items:
            item_orders = orders_by_item.get(item.id, [])
            total_created = len(item_orders)
            
            paid_orders = [o for o in item_orders if o.status == "paid"]
            failed_orders = [o for o in item_orders if o.status == "failed"]
            abandoned_orders = [o for o in item_orders if o.status == "abandoned"]
            
            total_paid = len(paid_orders)
            total_failed = len(failed_orders)
            total_abandoned = len(abandoned_orders)
            
            # 1. Cart Abandonment Rate (CAR)
            car = (total_abandoned / total_created) if total_created > 0 else 0.0
            
            # 2. Sales Velocity 7d (paid orders in last 7 days / 7.0)
            recent_paid = 0
            latest_paid_dt = None
            for po in paid_orders:
                po_dt = parse_iso_datetime(po.created_at)
                if latest_paid_dt is None or po_dt > latest_paid_dt:
                    latest_paid_dt = po_dt
                if (now - po_dt).days <= 7:
                    recent_paid += 1
            
            sales_velocity_7d = round(recent_paid / 7.0, 2)
            
            # 3. Inventory Stagnation Days
            if latest_paid_dt is not None:
                stagnation_days = max(0, (now - latest_paid_dt).days)
            else:
                stagnation_days = 30  # Default max if never sold
                
            # 4. Payment Failure Rate (PFR)
            payment_attempts = total_paid + total_failed
            pfr = (total_failed / payment_attempts) if payment_attempts > 0 else 0.0
            
            profile = ItemProfile(
                item_id=item.id,
                item_name=item.name,
                amount_inr=item.amount_inr,
                stock=item.stock,
                base_margin_pct=item.base_margin_pct,
                sales_velocity_7d=sales_velocity_7d,
                cart_abandonment_rate=round(car, 4),
                stagnation_days=stagnation_days,
                payment_failure_rate=round(pfr, 4),
                total_orders_created=total_created,
                total_orders_paid=total_paid,
                total_orders_failed=total_failed,
                total_orders_abandoned=total_abandoned
            )
            profiles[item.id] = profile
            
        return profiles

profiler_engine = ProfilerEngine()
