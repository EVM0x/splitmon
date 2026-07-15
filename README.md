# 🪙 SplitMon — Onchain Bill Splitter on Monad

**Split expenses with friends, settle via smart contract on Monad testnet.**

Built for the **BuildAnything Spark Hackathon** — vibecoded with ❤️

## What It Does

Tired of chasing friends for dinner money? SplitMon lets you:

1. **Create a Split** — Set title, add participants, amount per person, and deadline
2. **Friends Pay Their Share** — Each participant pays directly to the smart contract
3. **Auto-Release** — When everyone pays, funds auto-release to the creator
4. **Timeout Refund** — If the deadline passes without full payment, everyone gets refunded

## Tech Stack

- **Smart Contract**: Solidity (Foundry) on Monad Testnet
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Web3**: Wagmi + Viem
- **Contract**: `0x9f8b012407bF1D84055828dA60aD0B6F7D6891e5`

## Quick Start

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Compile contract
forge build

# Frontend
cd frontend
npm install
npm run dev
```

## Deploy Contract

```bash
# Set your private key
export PRIVATE_KEY=your_key

# Deploy
forge create --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY \
  contracts/SplitMon.sol:SplitMon
```

## Contract Features

- `createSplit(title, participants[], amount, deadline)` — Create a new split
- `payShare(splitId)` — Pay your share
- `releaseFunds(splitId)` — Release funds when fully paid
- `refund(splitId)` — Refund after deadline
- `getSplitDetails(splitId)` — View split status
- `getUserSplits(user)` — List all user's splits

## License

MIT
