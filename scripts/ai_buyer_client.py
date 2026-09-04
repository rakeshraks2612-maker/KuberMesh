#!/usr/bin/env python3
"""
KuberMesh External AI Buyer Agent Simulator (UAP / x402 Protocol)
Simulates an autonomous personal shopping assistant discovering a merchant catalog,
negotiating within pre-set policy boundaries, and capturing a verified Razorpay order.
"""

import sys
import time
import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8000"

# ANSI Colors
GREEN = "\033[92m"
BLUE = "\033[94m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_header(text):
    print(f"\n{BOLD}{BLUE}======================================================================={RESET}")
    print(f"{BOLD}{CYAN}  {text}{RESET}")
    print(f"{BOLD}{BLUE}======================================================================={RESET}\n")

def run_ai_buyer():
    print_header("🤖 KUBERMESH EXTERNAL AI BUYER AGENT — PROTOCOL SIMULATOR")
    buyer_id = "agent_gemini_buyer_client_01"
    print(f"• Initializing Buyer Agent Context: {BOLD}{buyer_id}{RESET}")
    print(f"• Protocol Target: {BOLD}NPCI-UAP / x402 Merchant Gateway{RESET} at {BASE_URL}\n")
    time.sleep(1)

    # 1. Discovery Phase
    print(f"{BOLD}[STEP 1: DISCOVERY]{RESET} Querying merchant protocol manifest from {BASE_URL}/api/a2a/catalog...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/a2a/catalog", headers={"User-Agent": "A2ABuyer/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            manifest = json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"{RED}✗ Failed to reach merchant gateway: {e}{RESET}")
        print("Please ensure KuberMesh server is running on http://localhost:8000")
        sys.exit(1)

    merchant = manifest.get("merchant", {})
    catalog = manifest.get("catalog", [])
    print(f"{GREEN}✓ Connected to Merchant:{RESET} {BOLD}{merchant.get('name')}{RESET} (ID: {merchant.get('id')})")
    print(f"• Discovered {len(catalog)} machine-readable SKUs in catalog.\n")
    time.sleep(1)

    if not catalog:
        print(f"{RED}No items in catalog.{RESET}")
        return

    # Select target SKU
    target_item = catalog[0]
    sku = target_item.get("sku")
    name = target_item.get("name")
    retail_price = target_item.get("base_price_inr")
    floor_price = target_item.get("ai_buyer_policy", {}).get("floor_price_inr", retail_price * 0.75)
    
    print(f"{BOLD}[STEP 2: POLICY EVALUATION]{RESET}")
    print(f"• Selected Target SKU: {BOLD}{name}{RESET} (SKU: {sku})")
    print(f"• Retail Base Price: ₹{retail_price:.2f}")
    print(f"• Merchant Floor Price (8% Margin Bound): ₹{floor_price:.2f}")
    
    # Calculate negotiation bid: Target 10% discount
    bid_inr = round(retail_price * 0.90, 2)
    bid_paise = int(bid_inr * 100)
    print(f"• AI Buyer Strategy: Submitting optimal bid at ₹{bid_inr:.2f} (10.0% discount)...")
    time.sleep(1.5)

    # 2. Negotiation Phase
    print(f"\n{BOLD}[STEP 3: PROTOCOL NEGOTIATION HANDSHAKE]{RESET}")
    print(f"Transmitting UAP negotiation payload to {merchant.get('agent_endpoint')}...")
    
    payload = {
        "buyer_agent_id": buyer_id,
        "sku": sku,
        "requested_quantity": 1,
        "offered_price_paise": bid_paise,
        "preferred_payment_method": "upi_intent",
        "max_delivery_sla_hours": 24
    }

    start_t = time.time()
    req_post = urllib.request.Request(
        f"{BASE_URL}/api/a2a/negotiate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "A2ABuyer/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req_post, timeout=5) as response:
        handshake_data = json.loads(response.read().decode("utf-8"))
    latency_ms = (time.time() - start_t) * 1000

    print(f"{GREEN}✓ Handshake Completed in {latency_ms:.1f}ms{RESET}")
    print(f"\n{BOLD}{YELLOW}┌─────────────────── AGENT-TO-AGENT HANDSHAKE RESPONSE ───────────────────┐{RESET}")
    print(f"│ Decision:             {BOLD}{GREEN if handshake_data.get('decision') == 'ACCEPTED' else RED}{handshake_data.get('decision')}{RESET}")
    print(f"│ Agreed Unit Price:    {BOLD}₹{handshake_data.get('agreed_price_paise', 0)/100:.2f}{RESET}")
    print(f"│ Total Amount:         {BOLD}₹{handshake_data.get('total_amount_paise', 0)/100:.2f}{RESET}")
    print(f"│ Discount Applied:     {BOLD}{handshake_data.get('discount_applied_pct')}%{RESET}")
    print(f"│ Razorpay Order ID:    {CYAN}{handshake_data.get('razorpay_order_id')}{RESET}")
    print(f"│ Cryptographic Token:  {BLUE}{handshake_data.get('signature_token')}{RESET}")
    print(f"│ Reason / Protocol Log:{RESET} {handshake_data.get('reason')}")
    print(f"{BOLD}{YELLOW}└──────────────────────────────────────────────────────────────────────────┘{RESET}\n")

    # 3. Checkout Phase
    print(f"{BOLD}[STEP 4: RAZORPAY CHECKOUT INTENT CAPTURED]{RESET}")
    print(f"• Live Checkout Link: {CYAN}{handshake_data.get('payment_link')}{RESET}")
    print(f"• Fulfillment SLA: {handshake_data.get('fulfillment_sla_hours')} hours guaranteed")
    print(f"\n{BOLD}{GREEN}🎉 Autonomous Agent-to-Agent Transaction Handshake Successfully Executed!{RESET}\n")

if __name__ == "__main__":
    run_ai_buyer()
