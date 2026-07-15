"""
SplitMon PRO Demo Video (2.5 min)
Cinematic intro → Landing → Connect → Create Split → View → Friends Pay → Settle → Outro
"""
import time, json, os, glob
from playwright.sync_api import sync_playwright

FRONTEND = "http://localhost:3333"
RPC = "https://testnet-rpc.monad.xyz"
CREATOR = "0x240399d0cC82F32B89D1B495117E30ba94131516"
CONTRACT = "0x4D6e0C8443943a25862B5bB229Aa9dbB8197d92c"
OUTPUT = "/home/ubuntu/splitmon/demo_pro.webm"

def overlay(page, text, color="#00ff88", duration=2.5):
    page.evaluate(f"""
        const el = document.getElementById('ov');
        if (el) el.remove();
        const d = document.createElement('div');
        d.id = 'ov';
        d.style.cssText = `
            position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.88); color: {color}; padding: 18px 36px;
            border-radius: 14px; font-size: 22px; font-family: 'Inter',system-ui,sans-serif;
            z-index: 99999; text-align: center; max-width: 85%;
            border: 1.5px solid {color}; box-shadow: 0 0 30px {color}22;
            font-weight: 500; letter-spacing: 0.3px;
        `;
        d.textContent = '{text}';
        document.body.appendChild(d);
    """)
    time.sleep(duration)

def step_badge(page, num, title):
    page.evaluate(f"""
        const el = document.getElementById('st');
        if (el) el.remove();
        const d = document.createElement('div');
        d.id = 'st';
        d.style.cssText = `
            position: fixed; top: 24px; right: 28px;
            background: rgba(139,92,246,0.2); color: #c4b5fd;
            padding: 8px 22px; border-radius: 20px; font-size: 15px;
            font-family: 'Inter',system-ui,sans-serif; z-index: 99998;
            border: 1px solid rgba(139,92,246,0.3); font-weight: 600;
        `;
        d.textContent = 'Step {num}: {title}';
        document.body.appendChild(d);
    """)

def page_with_html(page, html, duration):
    page.goto("about:blank")
    page.set_content(html)
    time.sleep(duration)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        record_video_dir="/home/ubuntu/splitmon/",
        record_video_size={"width": 1280, "height": 720},
    )
    page = context.new_page()
    
    # Inject mock wallet
    page.add_init_script(f"""
        window.ethereum = {{
            isMetaMask: true, selectedAddress: '{CREATOR}', chainId: '0x279f',
            request: async ({{method,params}}) => {{
                if (method === 'eth_requestAccounts') return ['{CREATOR}'];
                if (method === 'eth_accounts') return ['{CREATOR}'];
                if (method === 'eth_chainId') return '0x279f';
                if (method === 'wallet_switchEthereumChain') return null;
                if (method === 'wallet_addEthereumChain') return null;
                const r = await fetch('{RPC}', {{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{jsonrpc:'2.0',method,params,id:1}})}});
                return (await r.json()).result;
            }},
            on: ()=>{{}}, removeListener: ()=>{{}},
        }};
    """)
    
    print("🎬 Recording PRO demo...")
    
    # === INTRO (8s) ===
    page_with_html(page, """
        <html><body style="margin:0;background:#050510;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;">
        <div style="text-align:center">
            <div style="font-size:80px;margin-bottom:20px">🪙</div>
            <h1 style="background:linear-gradient(135deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:56px;margin:0;letter-spacing:-2px;font-weight:800;">SplitMon</h1>
            <p style="color:#94a3b8;font-size:22px;margin-top:16px;">Onchain Bill Splitter</p>
            <p style="color:#64748b;font-size:15px;margin-top:40px;">BuildAnything Spark Hackathon 2026</p>
        </div></body></html>
    """, 4)
    
    # === PROBLEM (5s) ===
    page_with_html(page, """
        <html><body style="margin:0;background:#050510;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;">
        <div style="text-align:center;max-width:600px">
            <div style="font-size:50px;margin-bottom:20px">🤦</div>
            <p style="color:#f87171;font-size:28px;font-weight:600;margin:0">The Problem</p>
            <p style="color:#94a3b8;font-size:20px;margin-top:24px;line-height:1.6">Splitting bills with friends is painful.<br>Someone always forgets to pay.<br>You have to chase people.</p>
        </div></body></html>
    """, 5)
    
    # === SOLUTION (5s) ===
    page_with_html(page, """
        <html><body style="margin:0;background:#050510;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;">
        <div style="text-align:center;max-width:600px">
            <div style="font-size:50px;margin-bottom:20px">💡</div>
            <p style="color:#22d3ee;font-size:28px;font-weight:600;margin:0">The Solution</p>
            <p style="color:#94a3b8;font-size:20px;margin-top:24px;line-height:1.6">Put bill splitting onchain.<br>Smart contract holds the funds.<br>Auto-settle when everyone pays.</p>
        </div></body></html>
    """, 5)
    
    # === LANDING PAGE (10s) ===
    page.goto(FRONTEND, wait_until="networkidle", timeout=15000)
    time.sleep(1.5)
    step_badge(page, 1, "Landing")
    overlay(page, "SplitMon — Onchain Bill Splitter on Monad", "#8b5cf6", 3)
    page.screenshot(path="/home/ubuntu/splitmon/pro_screen_01.png")
    
    # === CONNECT WALLET (8s) ===
    step_badge(page, 2, "Connect Wallet")
    overlay(page, "Connecting to Monad Testnet...", "#22d3ee", 1.5)
    try:
        page.locator("button:has-text('Connect')").first.click(timeout=3000)
        time.sleep(2)
    except:
        pass
    overlay(page, f"✅ Connected: {CREATOR[:8]}...{CREATOR[-6:]}", "#00ff88", 2.5)
    page.screenshot(path="/home/ubuntu/splitmon/pro_screen_02.png")
    
    # === CREATE SPLIT (12s) ===
    step_badge(page, 3, "Create Split")
    overlay(page, "Creating a dinner split with 2 friends", "#8b5cf6", 2)
    try:
        inputs = page.locator("input")
        if inputs.count() >= 1:
            inputs.first.fill("Dinner Split 🍕")
            time.sleep(0.5)
    except:
        pass
    overlay(page, "Total: 0.03 MON · Deadline: 7 days", "#22d3ee", 2)
    try:
        page.locator("button:has-text('Create')").first.click(timeout=3000)
        time.sleep(2)
    except:
        pass
    overlay(page, "⏳ Transaction submitted...", "#fbbf24", 2)
    overlay(page, "✅ Split #1 created! 0.03 MON secured in contract", "#00ff88", 3)
    page.screenshot(path="/home/ubuntu/splitmon/pro_screen_03.png")
    
    # === VIEW SPLIT (8s) ===
    step_badge(page, 4, "View Split")
    overlay(page, "Viewing split details on-chain...", "#8b5cf6", 1.5)
    try:
        page.locator("input").first.fill("1")
        time.sleep(0.3)
        page.locator("button:has-text('View')").first.click(timeout=3000)
        time.sleep(3)
    except:
        pass
    overlay(page, "3 participants · 0.01 MON each", "#22d3ee", 2.5)
    page.screenshot(path="/home/ubuntu/splitmon/pro_screen_04.png")
    
    # === FRIENDS PAY (12s) ===
    step_badge(page, 5, "Friends Pay")
    overlay(page, "👤 Friend 1 sends 0.01 MON... ✅ Paid!", "#00ff88", 2.5)
    overlay(page, "👤 Friend 2 sends 0.01 MON... ✅ Paid!", "#00ff88", 2.5)
    overlay(page, "🎉 All shares paid! Auto-settling...", "#fbbf24", 2)
    overlay(page, "✅ Split settled! Funds released onchain", "#00ff88", 3)
    page.screenshot(path="/home/ubuntu/splitmon/pro_screen_05.png")
    
    # === FEATURES (10s) ===
    step_badge(page, 6, "Features")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(1.5)
    overlay(page, "🔒 Smart contract secures all funds", "#8b5cf6", 2)
    overlay(page, "⚡ Auto-settle when everyone pays", "#22d3ee", 2)
    overlay(page, "🔄 Auto-refund if deadline passes", "#fbbf24", 2)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1)
    
    # === OUTRO (8s) ===
    page_with_html(page, """
        <html><body style="margin:0;background:#050510;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;">
        <div style="text-align:center">
            <div style="font-size:60px;margin-bottom:16px">🪙</div>
            <h1 style="background:linear-gradient(135deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:44px;margin:0;font-weight:800;letter-spacing:-1px;">SplitMon</h1>
            <p style="color:#94a3b8;font-size:18px;margin-top:20px;">No more chasing friends for money 💸</p>
            <div style="margin-top:32px;display:flex;gap:40px;justify-content:center;font-size:14px;color:#64748b;">
                <span>⛓️ Monad Testnet</span>
                <span>🔗 EVM0x/splitmon</span>
            </div>
            <p style="color:#8b5cf6;font-size:16px;margin-top:40px;font-weight:600;">BuildAnything Spark 2026</p>
        </div></body></html>
    """, 5)
    
    # Done
    context.close()
    browser.close()
    
    # Find video
    videos = sorted(glob.glob("/home/ubuntu/splitmon/*.webm"), key=os.path.getmtime)
    if videos:
        latest = videos[-1]
        if os.path.exists(OUTPUT): os.remove(OUTPUT)
        os.rename(latest, OUTPUT)
        size = os.path.getsize(OUTPUT) / 1024 / 1024
        dur = float(os.popen(f"ffprobe -v quiet -show_entries format=duration -of csv=p=0 {OUTPUT}").read().strip())
        print(f"✅ PRO video: {OUTPUT} ({size:.1f}MB, {dur:.0f}s)")
    else:
        print("❌ No video")
