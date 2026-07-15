#!/bin/bash
# SplitMon Demo Script
# 1. Create split + pay shares via cast
# 2. Record browser showing results via ffmpeg
set -e

RPC="https://testnet-rpc.monad.xyz"
CONTRACT="0x4D6e0C8443943a25862B5bB229Aa9dbB8197d92c"
PK="0x96144bd3a9bebec1f30fde0b08f674d2dcbe34b9e922a462279c3bbce262a33a"
CREATOR="0x240399d0cC82F32B89D1B495117E30ba94131516"

# Generate fresh friend wallets
F1_PK="0x3333444455556666777788889999aaaabbbbccccddddeeeeffff000011112222"
F1_ADDR=$(cast wallet address --private-key "$F1_PK")
F2_PK="0x444455556666777788889999aaaabbbbccccddddeeeeffff0000111122223333"
F2_ADDR=$(cast wallet address --private-key "$F2_PK")

echo "=== SplitMon Demo ==="
echo "Creator: $CREATOR"
echo "Friend 1: $F1_ADDR"
echo "Friend 2: $F2_ADDR"

# Fund friends
echo ""
echo "=== Funding friends ==="
cast send --rpc-url "$RPC" --private-key "$PK" "$F1_ADDR" --value 1ether 2>&1 | tail -1
cast send --rpc-url "$RPC" --private-key "$PK" "$F2_ADDR" --value 1ether 2>&1 | tail -1

# Create split: 0.02 MON total, 2 friends = 0.01 each, deadline 7 days
DEADLINE=$(($(date +%s) + 86400 * 7))
echo ""
echo "=== Creating split ==="
TX_OUT=$(cast send --rpc-url "$RPC" --private-key "$PK" "$CONTRACT" \
  "createSplit(address[],uint256,string)" \
  "[$F1_ADDR,$F2_ADDR]" "$DEADLINE" "Dinner Split 🍕" \
  --value 0.02ether --json 2>&1)

echo "$TX_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'TX: {d[\"transactionHash\"]}')"

# Get split ID from event
SPLIT_ID=$(cast receipt --rpc-url "$RPC" --json "$(echo "$TX_OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['transactionHash'])")" 2>&1 | python3 -c "
import sys,json
receipt=json.load(sys.stdin)
for log in receipt.get('logs', []):
    # SplitCreated topic
    if log.get('topics',[''])[0] == '0x64eb149bf5d2c053fa0cdf2e3d25721136b84fde394ee8f7edfa6b5db68de36b':
        split_id = int(log['topics'][1], 16)
        print(split_id)
        break
")
echo "Split ID: $SPLIT_ID"

# Friend 1 pays
echo ""
echo "=== Friend 1 paying ==="
cast send --rpc-url "$RPC" --private-key "$F1_PK" "$CONTRACT" \
  "payShare(uint256)" "$SPLIT_ID" --value 0.01ether 2>&1 | tail -1

# Friend 2 pays (auto-settles)
echo ""
echo "=== Friend 2 paying (auto-settle) ==="
cast send --rpc-url "$RPC" --private-key "$F2_PK" "$CONTRACT" \
  "payShare(uint256)" "$SPLIT_ID" --value 0.01ether 2>&1 | tail -1

# Verify
echo ""
echo "=== Verifying split ==="
cast call --rpc-url "$RPC" "$CONTRACT" "getSplit(uint256)(address,uint256,uint256,uint256,uint8,uint8,bool,bool,string,address[],bool[])" "$SPLIT_ID" 2>&1

echo ""
echo "=== DONE! Split $SPLIT_ID settled ==="
echo "Contract: $CONTRACT"
echo "Frontend: http://localhost:3333"
echo "SPLIT_ID=$SPLIT_ID" > /tmp/demo_split_id.txt
