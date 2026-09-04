import os
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

class GuardrailSettings(BaseModel):
    max_discount_pct: float = Field(default=20.0, description="Absolute ceiling on promotional discounts")
    min_margin_pct: float = Field(default=8.0, description="Minimum post-discount gross profit margin")
    max_price_delta_pct: float = Field(default=15.0, description="Max allowed price shift in a single update")
    max_sms_per_customer_per_week: int = Field(default=3, description="Anti-spam limit for abandoned cart outreach")
    max_offer_duration_hours: int = Field(default=72, description="Maximum valid duration for discount offers")
    min_offer_duration_hours: int = Field(default=1, description="Minimum valid duration for discount offers")
    target_velocity_7d: float = Field(default=3.0, description="Target baseline sales per day for healthy SKU")

class Settings(BaseModel):
    app_name: str = "KuberMesh"
    version: str = "1.0.0"
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = int(os.getenv("PORT", "8000"))
    
    # Razorpay API Credentials (Test Mode)
    razorpay_key_id: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_kubermesh_demo")
    razorpay_key_secret: str = os.getenv("RAZORPAY_KEY_SECRET", "kubermesh_test_secret_key")
    
    # Gemini API Key
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # Guardrails
    guardrails: GuardrailSettings = GuardrailSettings()
    
    # Data storage
    audit_ledger_path: Path = DATA_DIR / "audit_ledger.json"
    merchant_state_path: Path = DATA_DIR / "merchant_state.json"
    protocol_manifest_path: Path = DATA_DIR / "kubermesh.json"

settings = Settings()
