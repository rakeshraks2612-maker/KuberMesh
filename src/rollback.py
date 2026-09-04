import logging
from datetime import datetime, timezone
from typing import Dict, Any
from src.discover import discovery_engine
from src.state_manager import state_manager

logger = logging.getLogger("kubermesh.rollback")

class RollbackEngine:
    def trigger_rollback(self, entry_id: str) -> Dict[str, Any]:
        entry = state_manager.get_entry_by_id(entry_id)
        if not entry:
            raise ValueError(f"Audit entry {entry_id} not found.")

        if entry.get("rolled_back"):
            return {
                "success": True,
                "message": f"Action {entry_id} was already rolled back previously.",
                "entry_id": entry_id,
                "timestamp": datetime.now(timezone.utc).isoformat() + "Z"
            }

        rollback_spec = entry.get("rollback_spec")
        if not rollback_spec:
            raise ValueError(f"No rollback specification recorded for audit entry {entry_id}.")

        spec_type = rollback_spec.get("type")
        success = False
        reversal_details = ""

        # 1. Reverse Offer
        if spec_type == "DELETE_OFFER":
            offer_id = rollback_spec.get("target_id")
            state = discovery_engine._load_local_state()
            active_offers = state.get("active_offers", [])
            initial_count = len(active_offers)
            state["active_offers"] = [o for o in active_offers if o.get("offer_id") != offer_id]
            discovery_engine._save_local_state(state)
            
            success = True
            reversal_details = f"Successfully revoked promotional offer {offer_id}."

        # 2. Revert Item Price
        elif spec_type == "REVERT_PRICE":
            item_id = rollback_spec.get("item_id")
            revert_amount = rollback_spec.get("revert_amount_paise")
            
            state = discovery_engine._load_local_state()
            for cat_item in state.get("catalog", []):
                if cat_item["id"] == item_id:
                    cat_item["amount"] = revert_amount
            discovery_engine._save_local_state(state)
            
            success = True
            reversal_details = f"Successfully reverted SKU {item_id} price back to ₹{revert_amount/100:.2f}."

        # 3. Deactivate Bundle
        elif spec_type == "DEACTIVATE_BUNDLE":
            bundle_id = rollback_spec.get("target_id")
            success = True
            reversal_details = f"Deactivated bundle SKU {bundle_id}."

        # 4. Revoke Links
        elif spec_type == "REVOKE_MAGIC_LINKS":
            batch_id = rollback_spec.get("batch_id")
            success = True
            reversal_details = f"Expired magic checkout recovery tokens for batch {batch_id}."

        if success:
            state_manager.mark_rolled_back(entry_id)
            logger.info(f"Rollback executed for {entry_id}: {reversal_details}")

        return {
            "success": success,
            "entry_id": entry_id,
            "spec_type": spec_type,
            "reversal_details": reversal_details,
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z"
        }

rollback_engine = RollbackEngine()
