import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from src.config import settings
from src.models import AuditEntry

logger = logging.getLogger("kubermesh.state_manager")

class StateManager:
    def __init__(self):
        self.ledger_file = settings.audit_ledger_path
        self._ensure_ledger_file()

    def _ensure_ledger_file(self):
        if not self.ledger_file.exists():
            with open(self.ledger_file, "w", encoding="utf-8") as f:
                json.dump([], f)

    def record_entry(self, entry: AuditEntry) -> AuditEntry:
        self._ensure_ledger_file()
        try:
            with open(self.ledger_file, "r", encoding="utf-8") as f:
                entries = json.load(f)
            
            entries.insert(0, entry.model_dump())
            
            with open(self.ledger_file, "w", encoding="utf-8") as f:
                json.dump(entries, f, indent=2)
                
            logger.info(f"Recorded audit entry {entry.id} for item {entry.item_id} (Status: {entry.status})")
            return entry
        except Exception as e:
            logger.error(f"Failed to record audit entry: {e}")
            return entry

    def get_entries(self, limit: int = 50) -> List[Dict[str, Any]]:
        self._ensure_ledger_file()
        try:
            with open(self.ledger_file, "r", encoding="utf-8") as f:
                entries = json.load(f)
            return entries[:limit]
        except Exception as e:
            logger.error(f"Failed to read audit ledger: {e}")
            return []

    def get_entry_by_id(self, entry_id: str) -> Optional[Dict[str, Any]]:
        entries = self.get_entries(limit=500)
        for e in entries:
            if e.get("id") == entry_id:
                return e
        return None

    def mark_rolled_back(self, entry_id: str) -> bool:
        self._ensure_ledger_file()
        try:
            with open(self.ledger_file, "r", encoding="utf-8") as f:
                entries = json.load(f)
            
            updated = False
            for e in entries:
                if e.get("id") == entry_id:
                    e["rolled_back"] = True
                    e["status"] = "ROLLED_BACK"
                    updated = True
                    break
            
            if updated:
                with open(self.ledger_file, "w", encoding="utf-8") as f:
                    json.dump(entries, f, indent=2)
            return updated
        except Exception as e:
            logger.error(f"Failed to update rollback status in audit ledger: {e}")
            return False

state_manager = StateManager()
