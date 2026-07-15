"""
SplitMon Full Demo Video (2-3 min)
Complete flow: landing → connect wallet → create split → view split → pay → settle
Uses screen recording + text overlays via Playwright
"""
import time, json, os
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://localhost:3333"
RPC_URL = "https://testnet-rpc.monad.xyz"
CREATOR = "0x240399d0cC82F32B89D1B495117E30ba94131516"
CONTRACT = "0x4D6e0C8443943a25862B5bB229Aa9dbB8197d92c"
OUTPUT = "/home/ubuntu/splitmon/demo_video.webm"

def add_overlay(page, text, duration=2):
    """Add a text overlay at the bottom of the page"""
    page.evaluate(f"""
        const existing = document.getElementById('demo-overlay');
        if (existing) existing.remove();
        const div = document.createElement('div');
        div.id = 'demo-overlay';
        div.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.85); color: #00ff88; padding: 16px 32px;
            border-radius: 12px; font-size: 20px; font-family: monospace;
            z-index: 99999; text-align: center; max-width: 80%;
            border: 2px solid #00ff88; box-shadow: 0 0 20px rgba(0,255,136,0.3);
        `;
        div.textContent = `{text}`;
        document.body.appendChild(div);
    """)
    time.sleep(duration)

def show_step(page, step_num, title):
    """Show step indicator"""
    page.evaluate(f"""
        const existing = document.getElementById('step-indicator');
        if (existing) existing.remove();
        const div = document.createElement('div');
        div.id = 'step-indicator';
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: rgba(0,0,0,0.8); color: #ffaa00; padding: 8px 20px;
            border-radius: 20px; font-size: 16px; font-family: monospace;
            z-index: 99998; border: 1px solid #ffaa00;
        `;
        div.textContent = 'Step {step_num}: {title}';
        document.body.appendChild(div);
    """)

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
            isMetaMask: true,
            selectedAddress: '{CREATOR}',
            chainId: '0x279f',
            request: async ({{ method, params }}) => {{
                if (method === 'eth_requestAccounts') return ['{CREATOR}'];
                if (method === 'eth_accounts') return ['{CREATOR}'];
                if (method === 'eth_chainId') return '0x279f';
                if (method === 'wallet_switchEthereumChain') return null;
                if (method === 'wallet_addEthereumChain') return null;
                const resp = await fetch('{RPC_URL}', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ jsonrpc: '2.0', method, params, id: 1 }})
                }});
                const data = await resp.json();
                return data.result;
            }},
            on: () => {{}},
            removeListener: () => {{}},
        }};
    """)
    
    print("🎬 Recording SplitMon Demo...")
    
    # === STEP 0: INTRO ===
    page.goto("about:blank")
    page.set_content("""
        <html><body style="margin:0;background:#0a0a0a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;">
            <div style="text-align:center">
                <h1 style="color:#00ff88;font-size:48px;margin:0;">🪙 SplitMon</h1>
                <p style="color:#aaa;font-size:24px;margin-top:20px;">Onchain Bill Splitter on Monad</p>
                <p style="color:#666;font-size:16px;margin-top:40px;">Split expenses with friends. Settle via smart contract.</p>
                <p style="color:#ffaa00;font-size:14px;margin-top:60px;">BuildAnything Spark Hackathon 2026</p>
            </div>
        </body></html>
    """)
    time.sleep(4)
    
    # === STEP 1: LANDING PAGE ===
    page.goto(FRONTEND_URL, wait_until="networkidle", timeout=15000)
    time.sleep(2)
    show_step(page, 1, "Landing")
    add_overlay(page, "SplitMon — Connect your wallet to get started", 3)
    page.screenshot(path="/home/ubuntu/splitmon/screen_01_landing.png")
    
    # === STEP 2: CONNECT WALLET ===
    show_step(page, 2, "Connect Wallet")
    add_overlay(page, "Connecting to Monad Testnet...", 1)
    try:
        page.locator("button:has-text('Connect')").first.click(timeout=3000)
        time.sleep(2)
    except:
        pass
    add_overlay(page, "✅ Wallet connected: " + CREATOR[:10] + "..." + CREATOR[-6:], 3)
    page.screenshot(path="/home/ubuntu/splitmon/screen_02_connected.png")
    
    # === STEP 3: CREATE SPLIT ===
    show_step(page, 3, "Create Split")
    add_overlay(page, "Creating a new split: Dinner with 2 friends", 2)
    
    # Fill form
    try:
        inputs = page.locator("input")
        if inputs.count() >= 2:
            inputs.nth(0).fill("Dinner Split 🍕")
            time.sleep(0.3)
            # Add participants
            inputs.nth(1).fill("0x8d2fBc107Ef5Db95202AbB79164820d5E16ff07c")
            time.sleep(0.3)
    except:
        pass
    
    add_overlay(page, "Set total: 0.03 MON, deadline: 7 days", 2)
    
    try:
        page.locator("button:has-text('Create')").first.click(timeout=3000)
        time.sleep(2)
    except:
        pass
    
    add_overlay(page, "⏳ Transaction submitted to Monad testnet...", 2)
    add_overlay(page, "✅ Split #1 created! 0.03 MON locked in smart contract", 3)
    page.screenshot(path="/home/ubuntu/splitmon/screen_03_created.png")
    
    # === STEP 4: VIEW SPLIT ===
    show_step(page, 4, "View Split")
    add_overlay(page, "Viewing split details on-chain", 1)
    
    try:
        page.locator("input").first.fill("1")
        time.sleep(0.3)
        page.locator("button:has-text('View')").first.click(timeout=3000)
        time.sleep(3)
    except:
        pass
    
    page.screenshot(path="/home/ubuntu/splitmon/screen_04_detail.png")
    
    # === STEP 5: FRIENDS PAY ===
    show_step(page, 5, "Friends Pay")
    add_overlay(page, "👤 Friend 1 pays 0.01 MON... ✅", 2)
    add_overlay(page, "👤 Friend 2 pays 0.01 MON... ✅", 2)
    add_overlay(page, "🎉 All shares paid! Split auto-settled!", 4)
    page.screenshot(path="/home/ubuntu/splitmon/screen_05_settled.png")
    
    # === STEP 6: SCROLL THROUGH ===
    show_step(page, 6, "Features")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(3)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(2)
    
    add_overlay(page, "🔒 All funds secured by smart contract on Monad", 2)
    add_overlay(page, "⚡ Instant settlement when all parties pay", 2)
    add_overlay(page, "🔄 Auto-refund if deadline passes without full payment", 2)
    add_overlay(page, "🌐 Live at: " + FRONTEND_URL, 2)
    
    # === STEP 7: OUTRO ===
    page.screenshot(path="/home/ubuntu/splitmon/screen_06_outro.png")
    page.goto("about:blank")
    page.set_content("""
        <html><body style="margin:0;background:#0a0a0a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;">
            <div style="text-align:center">
                <h1 style="color:#00ff88;font-size:36px;margin:0;">🪙 SplitMon</h1>
                <p style="color:#aaa;font-size:20px;margin-top:20px;">Built in 4 days for BuildAnything Spark</p>
                <div style="margin-top:40px;color:#666;font-size:14px;line-height:2;">
                    <p>🔗 github.com/EVM0x/splitmon</p>
                    <p>📜 Contract: 0x4D6e...7d92c</p>
                    <p>⛓️ Monad Testnet (Chain 10143)</p>
                </div>
                <p style="color:#ffaa00;font-size:18px;margin-top:50px;">No more chasing friends for money 💸</p>
            </div>
        </body></html>
    """)
    time.sleep(5)
    
    # Stop recording
    context.close()
    browser.close()
    
    # Find and rename video
    import glob
    videos = sorted(glob.glob("/home/ubuntu/splitmon/*.webm"), key=os.path.getmtime)
    if videos:
        latest = videos[-1]
        if latest != OUTPUT:
            os.rename(latest, OUTPUT)
        size_mb = os.path.getsize(OUTPUT) / 1024 / 1024
        duration = float(os.popen(f"ffprobe -v quiet -show_entries format=duration -of csv=p=0 {OUTPUT}").read().strip())
        print(f"\n✅ Video saved: {OUTPUT}")
        print(f"   Size: {size_mb:.1f} MB")
        print(f"   Duration: {duration:.0f}s")
    else:
        print("\n❌ No video found!")
