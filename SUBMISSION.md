# 🪙 SplitMon — Hackathon Submission

**BuildAnything Spark Hackathon**

---

## 1. Project Description (Elevator Pitch)

SplitMon is an onchain bill splitter on Monad — one person creates a split, friends pay their share to a smart contract, and funds auto-settle when everyone's paid. No more chasing people for money. No more awkward "hey, you still owe me" DMs.

---

## 2. Problem It Solves

We've all been there. You're out with 5 friends, the bill comes, and one person puts down their card or sends the crypto. Then the real pain begins — the week-long group chat saga of reminders, "I'll send it later," and that one friend who just never pays.

SplitMon kills that friction. The creator funds the split upfront, friends pay their share to the contract, and it's settled. If the deadline passes and some haven't paid, everyone who did gets a refund. If at least some have paid, the creator can do a partial release. It's trustless, transparent, and eliminates the social tax of being the one who fronted the bill.

Built because I'm tired of being the group wallet.

---

## 3. How It Works

### Smart Contract Flow

**1. Create** — The creator calls `createSplit()` with participants' addresses, a deadline, and a title. They send the total amount as msg.value. The contract calculates `perPerson = total / participantCount` and records the creator as already "paid."

**2. Share** — The creator gets back a Split ID. They share that ID (and the contract address) with friends via DM, group chat, or a link.

**3. Pay** — Friends call `payShare(splitId)` with exactly `perPerson` MON. The contract tracks who's paid. If the last person pays, the contract **auto-settles** — all funds go to the creator immediately. No manual trigger needed.

**4. Partial Release** — If 2+ people paid but not everyone, the creator can call `releaseFunds()` to pull out the amount covered so far. The rest stays in the contract for others to pay or refund.

**5. Refund** — If the deadline passes, anyone who paid can call `refund()` to get their share back. If everyone refunds, the contract marks the split as fully refunded.

### Contract Security

- Checks-effects-interactions pattern (no reentrancy)
- Deadline-based timeout (prevents locked funds)
- Only participants can pay/refund
- Only creator can release funds
- Duplicate address and self-inclusion checks on creation
- Even-divisibility enforced (no dust)

### Tech Stack

| Layer | Tech |
|-------|------|
| Smart Contract | Solidity 0.8.20 + Foundry |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Web3 | Wagmi v2 + Viem |
| Chain | Monad Testnet (Chain ID: 10143) |

**Contract:** `0x4D6e0C8443943a25862B5bB229Aa9dbB8197d92c`

**Repo:** [github.com/EVM0x/splitmon](https://github.com/EVM0x/splitmon)

---

## 4. Why Monad

Monad's 10,000 TPS and sub-second finality make SplitMon feel instant. When you're splitting a dinner bill at the table, you don't want to wait 15 seconds for a confirmation — Monad's block times mean the flow is smooth: create, pay, settled, done. Near-zero gas fees also mean splitting a 0.5 MON bill doesn't cost more in gas than the split itself, which is a real problem on other chains. For a hackathon, Monad's EVM compatibility meant I could use the same Solidity + Foundry + Wagmi stack I know, but ship something that actually feels like a real product, not a testnet demo.

---

## 5. Social Post (X/Twitter)

```
🪙 SplitMon — onchain bill splitter on @monad_xyz

Create a split, friends pay their share, funds auto-settle. No more chasing people for money. Built for the @BuildAnything Spark Hackathon.

github.com/EVM0x/splitmon
```

*(271 characters)*
