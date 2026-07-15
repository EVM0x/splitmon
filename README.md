# 🪙 SplitMon — Onchain Bill Splitter on Monad

**Split expenses with friends, settle via smart contract.** No more chasing people for money.

Built for the **BuildAnything Spark Hackathon** — vibecoded with ❤️

[![Monad](https://img.shields.io/badge/Monad-Testnet-8b5cf6)](https://testnet.monad.xyz)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)

## The Problem

You go out for dinner with 5 friends. The bill is 3 MON. You pay upfront... and then spend the next week DMing everyone "hey, can you send me 0.6 MON?" 

**SplitMon fixes this.** One person creates a split, friends pay their share to a smart contract, and funds are released automatically. No awkward reminders. No forgotten IOUs.

## How It Works

| Step | Action | Description |
|------|--------|-------------|
| 1 | **Create** | Set amount, add friends' addresses, fund the split |
| 2 | **Share** | Give friends the Split ID — they pay directly |
| 3 | **Settle** | All paid? Funds auto-release to creator |
| 4 | **Refund** | Deadline passed? Everyone gets their money back |

### Partial Release
If at least 2 people have paid but not everyone, the creator can **release partial funds** — collect what's been paid so far while the rest stays open for refunds.

## Smart Contract

**Address:** `0x9f8b012407bF1D84055828dA60aD0B6F7D6891e5`  
**Network:** Monad Testnet (Chain ID: 10143)  
**Explorer:** [Monad Testnet Explorer](https://testnet.monadexplorer.com)

### Functions

| Function | Description |
|----------|-------------|
| `createSplit(participants[], deadline, title)` | Create a new split (payable) |
| `payShare(splitId)` | Pay your share |
| `releaseFunds(splitId)` | Creator releases partial funds (≥2 paid) |
| `refund(splitId)` | Claim refund after deadline |
| `getSplit(splitId)` | View full split details |
| `splitCount()` | Total splits created |

### Events

- `SplitCreated` — New split created
- `PaymentMade` — Participant paid their share
- `PartialRelease` — Creator released partial funds
- `SplitSettled` — All paid, funds released
- `SplitRefunded` — Everyone refunded
- `ParticipantRefunded` — Individual refund claimed

## Tech Stack

- **Smart Contract:** Solidity 0.8.20 + Foundry
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Web3:** Wagmi v2 + Viem

## Quick Start

```bash
# Clone
git clone https://github.com/EVM0x/splitmon.git
cd splitmon

# Smart contract
forge build

# Frontend
cd frontend
npm install
npm run dev
```

## Deploy

```bash
forge create \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY \
  contracts/SplitMon.sol:SplitMon
```

## Security

- ✅ No reentrancy vectors (checks-effects-interactions pattern)
- ✅ Timeout protection prevents locked funds
- ✅ Only creator can release funds
- ✅ Only participants can pay or refund

## License

MIT — Built for the [BuildAnything Spark Hackathon](https://buildanything.so/hackathons/spark)
