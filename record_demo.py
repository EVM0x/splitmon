"""
SplitMon Demo Recorder
Uses Playwright to record a 3-minute demo video.
Injects a mock wallet (private key) so we don't need MetaMask.
"""
import json
import time
import sys
from playwright.sync_api import sync_playwright
from web3 import Web3

# Config
RPC_URL = "https://testnet-rpc.monad.xyz"
CONTRACT_ADDRESS = "0x4D6e0C8443943a25862B5bB229Aa9dbB8197d92c"
FRONTEND_URL = "http://localhost:3333"
PRIVATE_KEY = "0x96144bd3a9bebec1f30fde0b08f674d2dcbe34b9e922a462279c3bbce262a33a"
OUTPUT_VIDEO = "/home/ubuntu/splitmon/demo.mp4"

# We'll generate some test wallets for "friends"
FRIEND_KEYS = [
    "0x1111111111111111111111111111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222222222222222222222222222",
]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)
creator = account.address

# Generate friend addresses
friends = []
for fk in FRIEND_KEYS:
    try:
        fa = w3.eth.account.from_key(fk)
        friends.append(fa)
    except:
        friends.append(None)

# Load contract ABI
with open("/tmp/splitmon_abi.json") as f:
    abi = json.load(f)

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)

print(f"Creator: {creator}")
print(f"Friend 1: {friends[0].address if friends[0] else 'invalid key'}")
print(f"Friend 2: {friends[1].address if friends[1] else 'invalid key'}")

# First, create a split on-chain via direct tx (before recording)
def create_split_demo():
    """Create a split with 2 friends, 0.01 MON each"""
    participants = [f.address for f in friends if f]
    total_amount = w3.to_wei(0.02, "ether")  # 0.02 MON total = 0.01 per person
    deadline = int(time.time()) + 86400 * 7  # 7 days from now
    title = "Demo: Dinner Split 🍕"
    
    tx = contract.functions.createSplit(
        participants,
        deadline,
        title
    ).build_transaction({
        "from": creator,
        "value": total_amount,
        "gas": 500000,
        "gasPrice": w3.eth.gas_price,
        "nonce": w3.eth.get_transaction_count(creator),
    })
    
    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    # Get split ID from event
    logs = contract.events.SplitCreated().process_receipt(receipt)
    if not logs:
        print("No SplitCreated event found! Checking receipt logs...")
        print(f"Receipt logs: {receipt['logs']}")
        raise Exception("Split creation failed")
    split_id = logs[0]["args"]["splitId"]
    
    print(f"✅ Split created! ID: {split_id}, tx: {tx_hash.hex()}")
    return split_id

def friend_pay(split_id, friend_idx):
    """Friend pays their share"""
    friend = friends[friend_idx]
    if not friend:
        return
    
    per_person = w3.to_wei(0.01, "ether")
    
    tx = contract.functions.payShare(split_id).build_transaction({
        "from": friend.address,
        "value": per_person,
        "gas": 300000,
        "gasPrice": w3.eth.gas_price,
        "nonce": w3.eth.get_transaction_count(friend.address),
    })
    
    signed = w3.eth.account.sign_transaction(tx, FRIEND_KEYS[friend_idx])
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"✅ Friend {friend_idx+1} paid! tx: {tx_hash.hex()}")
    return receipt

# --- MAIN ---

print("\n=== PHASE 1: Create split on-chain ===")
split_id = create_split_demo()

# Fund friends from creator so they have gas
print("\n=== Funding friends for gas ===")
for i, friend in enumerate(friends):
    if friend:
        tx = {
            "from": creator,
            "to": friend.address,
            "value": w3.to_wei(0.5, "ether"),
            "gas": 21000,
            "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(creator),
        }
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"✅ Sent 0.5 MON to friend {i+1}")

print("\n=== PHASE 2: Friend 1 pays ===")
friend_pay(split_id, 0)

print("\n=== PHASE 3: Friend 2 pays (auto-settles) ===")
friend_pay(split_id, 1)

print("\n=== DONE! Now recording the browser demo ===")

# Now record browser showing the results
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        record_video_dir="/home/ubuntu/splitmon/",
        record_video_size={"width": 1280, "height": 720},
    )
    page = context.new_page()
    
    # Inject mock ethereum provider
    page.add_init_script(f"""
        const mockAddress = '{creator}';
        const mockChainId = '0x279f'; // 10143
        
        // Mock ethereum provider
        window.ethereum = {{
            isMetaMask: true,
            selectedAddress: mockAddress,
            chainId: mockChainId,
            request: async ({{ method, params }}) => {{
                console.log('eth_request:', method, params);
                if (method === 'eth_requestAccounts') return [mockAddress];
                if (method === 'eth_accounts') return [mockAddress];
                if (method === 'eth_chainId') return mockChainId;
                if (method === 'wallet_switchEthereumChain') return null;
                if (method === 'wallet_addEthereumChain') return null;
                if (method === 'personal_sign') return '0x0000000000000000000000000000000000000000000000000000000000000000';
                
                // Forward to real RPC
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
            _events: {{}},
            _state: {{
                accounts: [mockAddress],
                isConnected: true,
                isUnlocked: true,
                initialized: true,
            }},
        }};
        
        // Also set for wagmi v2
        window.dispatchEvent(new Event('ethereum#initialized'));
    """)
    
    # Navigate to frontend
    print("Navigating to frontend...")
    page.goto(FRONTEND_URL, wait_until="networkidle")
    time.sleep(2)
    
    # Click "Connect Wallet"
    print("Clicking Connect Wallet...")
    connect_btn = page.locator("button:has-text('Connect Wallet')")
    if connect_btn.count() > 0:
        connect_btn.first.click()
        time.sleep(1)
    
    # Take a screenshot to verify
    page.screenshot(path="/home/ubuntu/splitmon/demo_screenshot.png")
    print("Screenshot saved")
    
    # Navigate to "View a Split" and enter split ID
    print(f"Viewing split {split_id}...")
    split_input = page.locator("input[type='number']")
    if split_input.count() > 0:
        split_input.first.fill(str(split_id))
        time.sleep(0.5)
        view_btn = page.locator("button:has-text('View')")
        if view_btn.count() > 0:
            view_btn.first.click()
            time.sleep(3)
    
    page.screenshot(path="/home/ubuntu/splitmon/demo_screenshot2.png")
    
    # Record for a few more seconds
    time.sleep(5)
    
    # Scroll down to show all content
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(2)
    
    # Close and save video
    context.close()
    browser.close()
    
    # Rename video
    import glob
    videos = glob.glob("/home/ubuntu/splitmon/*.webm")
    if videos:
        import os
        os.rename(videos[0], OUTPUT_VIDEO)
        print(f"\n✅ Video saved to {OUTPUT_VIDEO}")
    else:
        print("\n❌ No video found!")
