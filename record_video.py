"""
SplitMon Demo Video Recorder
Shows: Connect Wallet → View Split → Split details (settled)
Records to /home/ubuntu/splitmon/demo_video.webm
"""
import time, json
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://localhost:3333"
RPC_URL = "https://testnet-rpc.monad.xyz"
CREATOR = "0x240399d0cC82F32B89D1B495117E30ba94131516"
CONTRACT = "0x4D6e0C8443943a25862B5bB229Aa9dbB8197d92c"
OUTPUT = "/home/ubuntu/splitmon/demo_video.webm"

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
    
    print("🎬 Recording started...")
    page.goto(FRONTEND_URL, wait_until="networkidle", timeout=15000)
    time.sleep(2)
    
    # Screenshot 1: Landing page
    page.screenshot(path="/home/ubuntu/splitmon/screen_01_landing.png")
    print("📸 Screen 1: Landing page")
    
    # Click Connect Wallet
    try:
        page.locator("button:has-text('Connect')").first.click(timeout=3000)
        time.sleep(2)
        page.screenshot(path="/home/ubuntu/splitmon/screen_02_connected.png")
        print("📸 Screen 2: Wallet connected")
    except:
        print("⚠️ Connect button not found, continuing...")
    
    # Enter split ID 1 and view
    try:
        # Find input field
        inputs = page.locator("input")
        if inputs.count() > 0:
            inputs.first.fill("1")
            time.sleep(0.5)
            page.locator("button:has-text('View')").first.click(timeout=3000)
            time.sleep(3)
            page.screenshot(path="/home/ubuntu/splitmon/screen_03_split_detail.png")
            print("📸 Screen 3: Split detail")
    except:
        print("⚠️ Could not view split, taking full page screenshot")
    
    # Scroll through the page
    page.evaluate("window.scrollTo(0, 300)")
    time.sleep(2)
    page.evaluate("window.scrollTo(0, 600)")
    time.sleep(2)
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1)
    
    # Show full page
    page.screenshot(path="/home/ubuntu/splitmon/screen_04_full.png", full_page=True)
    print("📸 Screen 4: Full page")
    
    time.sleep(3)
    
    # Stop recording
    context.close()
    browser.close()
    
    # Find and rename the video
    import glob, os
    videos = sorted(glob.glob("/home/ubuntu/splitmon/*.webm"), key=os.path.getmtime)
    if videos:
        latest = videos[-1]
        os.rename(latest, OUTPUT)
        size_mb = os.path.getsize(OUTPUT) / 1024 / 1024
        print(f"\n✅ Video saved: {OUTPUT} ({size_mb:.1f} MB)")
    else:
        print("\n❌ No video found!")
