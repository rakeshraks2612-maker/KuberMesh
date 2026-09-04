#!/usr/bin/env python3
"""
Auto-Healing Tunnel Keeper & Keep-Alive Daemon for KuberMesh.
Maintains an active Cloudflare tunnel, prevents idle timeout with periodic health pings,
and automatically recovers/restarts within 2 seconds if the edge drops.
"""
import subprocess
import re
import time
import urllib.request
import os
import sys

URL_FILE = "static/tunnel_url.txt"
README_FILE = "README.md"

def update_readme_url(new_url):
    try:
        if os.path.exists(README_FILE):
            with open(README_FILE, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Replace trycloudflare.com URLs
            updated = re.sub(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", new_url, content)
            if updated != content:
                with open(README_FILE, "w", encoding="utf-8") as f:
                    f.write(updated)
                print(f"[TunnelKeeper] Updated {README_FILE} with active URL: {new_url}", flush=True)
                
                # Push git update in background
                subprocess.Popen(["git", "add", README_FILE])
                subprocess.Popen(["git", "commit", "-m", f"docs: auto-heal live demo URL to {new_url}"])
                subprocess.Popen(["git", "push", "origin", "main"])
    except Exception as e:
        print(f"[TunnelKeeper] Error updating README: {e}", flush=True)

def run_tunnel():
    while True:
        print("[TunnelKeeper] Spawning fresh Cloudflare Tunnel on port 8000...", flush=True)
        cmd = ["/opt/homebrew/bin/cloudflared", "tunnel", "--url", "http://localhost:8000"]
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        tunnel_url = None
        start_time = time.time()

        for line in proc.stdout:
            print(line, end="", flush=True)
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
            if match and not tunnel_url:
                tunnel_url = match.group(0)
                print(f"\n==================================================", flush=True)
                print(f"[TunnelKeeper] ACTIVE LIVE URL: {tunnel_url}", flush=True)
                print(f"==================================================\n", flush=True)
                
                os.makedirs("static", exist_ok=True)
                with open(URL_FILE, "w", encoding="utf-8") as f:
                    f.write(tunnel_url)
                
                update_readme_url(tunnel_url)
                break

        if not tunnel_url:
            print("[TunnelKeeper] Failed to capture tunnel URL. Retrying in 3s...", flush=True)
            proc.kill()
            time.sleep(3)
            continue

        # Keep-Alive Heartbeat Loop: Ping every 10 seconds to keep QUIC connection warm
        consecutive_failures = 0
        while proc.poll() is None:
            time.sleep(10)
            try:
                req = urllib.request.Request(
                    f"{tunnel_url}/api/catalog",
                    headers={"User-Agent": "KuberMesh-KeepAlive-Heartbeat/1.0"}
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    if resp.status == 200:
                        consecutive_failures = 0
                    else:
                        consecutive_failures += 1
            except Exception as e:
                consecutive_failures += 1
                print(f"[TunnelKeeper] Ping warning ({consecutive_failures}/3): {e}", flush=True)

            if consecutive_failures >= 3:
                print("[TunnelKeeper] Tunnel unhealthy after 3 failed pings. Auto-restarting tunnel...", flush=True)
                proc.kill()
                break

        print("[TunnelKeeper] Tunnel process terminated. Restarting fresh instance...", flush=True)
        time.sleep(2)

if __name__ == "__main__":
    run_tunnel()
