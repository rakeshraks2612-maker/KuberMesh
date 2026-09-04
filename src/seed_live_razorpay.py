import os
import logging
import razorpay
from dotenv import load_dotenv

load_dotenv()

KEY_ID = os.getenv("RAZORPAY_KEY_ID")
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_live_razorpay")

def seed_live_dashboard():
    if not KEY_ID or not KEY_SECRET or KEY_ID.startswith("rzp_test_kubermesh_demo"):
        print("⚠️ Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.")
        print("Example:\nRAZORPAY_KEY_ID=rzp_test_XXXXXXXX\nRAZORPAY_KEY_SECRET=YYYYYYYY")
        return

    client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))
    print(f"🔗 Connected to live Razorpay Test Account with Key ID: {KEY_ID}")

    sample_items = [
        {"name": "AuraSound Pro ANC Earbuds", "description": "Active Noise Cancelling True Wireless Earbuds", "amount": 149900, "currency": "INR"},
        {"name": "AuraSound Armour Silicone Case", "description": "Shockproof protective silicone case", "amount": 39900, "currency": "INR"},
        {"name": "Chronos AMOLED Smartwatch", "description": "1.43-inch AMOLED Display with Bluetooth Calling", "amount": 299900, "currency": "INR"},
        {"name": "VoltPulse 65W GaN Dual-Port Charger", "description": "Ultra-compact GaN fast charger with PD 3.0", "amount": 119900, "currency": "INR"},
        {"name": "VortexRGB Mechanical Keyboard", "description": "Hot-swappable tactile blue switches with RGB", "amount": 349900, "currency": "INR"}
    ]

    created_items = []
    print("\n📦 Seeding Catalog Items into Razorpay Test Dashboard...")
    for item_data in sample_items:
        try:
            item = client.item.create(item_data)
            created_items.append(item)
            print(f"  ✓ Created Item: {item['name']} (ID: {item['id']}) - ₹{item['amount']/100}")
        except Exception as e:
            print(f"  ✗ Failed to create {item_data['name']}: {e}")

    print("\n🛒 Creating Sample Test Orders...")
    for item in created_items[:3]:
        try:
            order = client.order.create({
                "amount": item["amount"],
                "currency": "INR",
                "receipt": f"rcpt_{item['id'][:8]}",
                "notes": {"item_id": item["id"], "source": "KuberMesh_Agent"}
            })
            print(f"  ✓ Created Order for {item['name']}: {order['id']}")
        except Exception as e:
            print(f"  ✗ Failed to create order: {e}")

    print("\n✅ Seeding Complete! Check your live Test Mode dashboard at https://dashboard.razorpay.com/")

if __name__ == "__main__":
    seed_live_dashboard()
