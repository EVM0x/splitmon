"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { parseEther, formatEther } from "viem";
import { SPLITMON_ABI, CONTRACT_ADDRESS } from "@/lib/contract";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Form state
  const [view, setView] = useState<"home" | "create" | "detail">("home");
  const [splitId, setSplitId] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [createdSplitId, setCreatedSplitId] = useState<number | null>(null);

  // Contract interactions
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash || undefined });

  // Read split
  const { data: splitData, refetch: refetchSplit } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SPLITMON_ABI,
    functionName: "getSplit",
    args: splitId > 0 ? [BigInt(splitId)] : undefined,
    query: { enabled: splitId > 0 },
  }) as { data: readonly unknown[] | undefined; refetch: () => void };

  const { data: splitCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SPLITMON_ABI,
    functionName: "splitCount",
  }) as { data: bigint | undefined };

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch {
      setError("Failed to connect wallet. Make sure you're on Monad Testnet.");
    }
  };

  const handleCreate = async () => {
    setError("");
    setSuccessMsg("");

    if (!title.trim()) return setError("Please enter a title");
    if (!participants.trim()) return setError("Please enter at least one participant");
    if (!totalAmount || parseFloat(totalAmount) <= 0) return setError("Please enter a valid amount");

    const participantList = participants
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length === 42 && a.startsWith("0x"));

    if (participantList.length === 0) return setError("Enter valid addresses (0x...) separated by commas");

    const totalPeople = participantList.length + 1; // +1 for creator
    const amountWei = parseEther(totalAmount);
    if (amountWei % BigInt(totalPeople) !== BigInt(0)) {
      return setError(`Amount ${totalAmount} MON not evenly divisible by ${totalPeople} people`);
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadlineHours) * 3600);

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: SPLITMON_ABI,
        functionName: "createSplit",
        args: [participantList as `0x${string}`[], deadline, title],
        value: amountWei,
      });
      setTxHash(hash);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message?.slice(0, 200) || "Transaction failed");
    }
  };

  const handlePay = async (id: number, perPerson: bigint) => {
    setError("");
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: SPLITMON_ABI,
        functionName: "payShare",
        args: [BigInt(id)],
        value: perPerson,
      });
      setTxHash(hash);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message?.slice(0, 200) || "Transaction failed");
    }
  };

  const handleRefund = async (id: number) => {
    setError("");
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: SPLITMON_ABI,
        functionName: "refund",
        args: [BigInt(id)],
      });
      setTxHash(hash);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message?.slice(0, 200) || "Transaction failed");
    }
  };

  const handleRelease = async (id: number) => {
    setError("");
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: SPLITMON_ABI,
        functionName: "releaseFunds",
        args: [BigInt(id)],
      });
      setTxHash(hash);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message?.slice(0, 200) || "Transaction failed");
    }
  };

  // Watch for split creation event to get split ID
  useEffect(() => {
    if (!txHash || !isConfirmed || !publicClient) return;

    (async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && log.topics.length >= 2) {
            const id = Number(BigInt(log.topics[1] as `0x${string}`));
            if (id > 0 && !createdSplitId) {
              setCreatedSplitId(id);
              setSuccessMsg(`Split #${id} created! Share this ID with your friends.`);
            }
          }
        }
      } catch {
        // ignore receipt parse errors
      }
    })();
  }, [isConfirmed, txHash, publicClient]);

  const handleViewSplit = (e: React.FormEvent) => {
    e.preventDefault();
    if (splitId > 0) {
      setView("detail");
      refetchSplit?.();
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-lg font-bold">
            S
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SplitMon</h1>
            <p className="text-xs text-zinc-500">onchain bill splitter · Monad</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("home")}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Home
          </button>
          <button
            onClick={() => setView("create")}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            New Split
          </button>
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Error / Success */}
      {(error || successMsg) && (
        <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${error ? "bg-red-950 border border-red-800 text-red-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"}`}>
          {error || successMsg}
          <button className="ml-3 underline" onClick={() => { setError(""); setSuccessMsg(""); }}>Dismiss</button>
        </div>
      )}

      {/* Tx status */}
      {txHash && (
        <div className="mx-6 mt-2 text-xs text-zinc-500">
          Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}{" "}
          {isConfirming ? "(confirming...)" : isConfirmed ? "✓ confirmed" : ""}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        {view === "home" && <HomeView splitCount={splitCount} splitId={splitId} setSplitId={setSplitId} handleViewSplit={handleViewSplit} />}
        {view === "create" && (
          <CreateView
            isConnected={isConnected}
            title={title} setTitle={setTitle}
            participants={participants} setParticipants={setParticipants}
            totalAmount={totalAmount} setTotalAmount={setTotalAmount}
            deadlineHours={deadlineHours} setDeadlineHours={setDeadlineHours}
            handleCreate={handleCreate}
            isConfirming={isConfirming}
          />
        )}
        {view === "detail" && splitData && (
          <DetailView
            splitId={splitId}
            splitData={splitData}
            address={address}
            handlePay={handlePay}
            handleRefund={handleRefund}
            handleRelease={handleRelease}
            isConfirming={isConfirming}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 text-center text-xs text-zinc-600">
        SplitMon · Built for Spark Hackathon · Powered by Monad
      </footer>
    </main>
  );
}

// ========== Sub-views ==========

function HomeView({
  splitCount,
  splitId,
  setSplitId,
  handleViewSplit,
}: {
  splitCount: bigint | undefined;
  splitId: number;
  setSplitId: (n: number) => void;
  handleViewSplit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-3xl font-bold shadow-lg shadow-violet-500/20">
        S
      </div>
      <h2 className="text-3xl font-bold mb-3">Split bills, not friendships.</h2>
      <p className="text-zinc-400 max-w-md mx-auto mb-8">
        Create a split, invite friends, and let the smart contract handle the rest. 
        Everyone pays their share — or gets refunded if the deadline passes.
      </p>

      <div className="flex gap-3 justify-center mb-10">
        <a href="#create" onClick={(e) => { e.preventDefault(); }} className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-medium transition-colors">
          Create a Split
        </a>
      </div>

      {/* View existing split */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm mx-auto">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">View a Split</h3>
        <form onSubmit={handleViewSplit} className="flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="Split ID"
            value={splitId || ""}
            onChange={(e) => setSplitId(parseInt(e.target.value) || 0)}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View
          </button>
        </form>
        {splitCount !== undefined && (
          <p className="text-xs text-zinc-600 mt-2">
            {Number(splitCount)} split{Number(splitCount) !== 1 ? "s" : ""} created so far
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="mt-12 grid grid-cols-3 gap-4 text-left">
        {[
          { step: "1", title: "Create", desc: "Set the amount, add friends' addresses, and fund the split." },
          { step: "2", title: "Share", desc: "Give friends the Split ID. They pay their share directly." },
          { step: "3", title: "Settle", desc: "When all pay, funds release. Or refund if deadline passes." },
        ].map((s) => (
          <div key={s.step} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="w-7 h-7 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-xs font-bold mb-2">
              {s.step}
            </div>
            <h4 className="font-semibold text-sm mb-1">{s.title}</h4>
            <p className="text-xs text-zinc-500">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateView({
  isConnected,
  title, setTitle,
  participants, setParticipants,
  totalAmount, setTotalAmount,
  deadlineHours, setDeadlineHours,
  handleCreate,
  isConfirming,
}: {
  isConnected: boolean;
  title: string; setTitle: (s: string) => void;
  participants: string; setParticipants: (s: string) => void;
  totalAmount: string; setTotalAmount: (s: string) => void;
  deadlineHours: string; setDeadlineHours: (s: string) => void;
  handleCreate: () => void;
  isConfirming: boolean;
}) {
  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400 mb-4">Connect your wallet to create a split</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Create a Split</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Title</label>
          <input
            type="text"
            placeholder="Dinner at Sushi Place 🍣"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">
            Total Amount (MON)
          </label>
          <input
            type="number"
            step="0.001"
            placeholder="1.0"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">
            Friends&apos; Addresses
          </label>
          <textarea
            placeholder="0xAbC...123, 0xDeF...456"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
          />
          <p className="text-xs text-zinc-600 mt-1">
            Comma-separated Monad addresses (max 20)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">
            Deadline (hours from now)
          </label>
          <select
            value={deadlineHours}
            onChange={(e) => setDeadlineHours(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500"
          >
            {[1, 2, 4, 8, 12, 24, 48, 72, 168].map((h) => (
              <option key={h} value={h}>{h} hour{h > 1 ? "s" : ""}</option>
            ))}
          </select>
          <p className="text-xs text-zinc-600 mt-1">
            After deadline, participants can refund if not fully paid
          </p>
        </div>

        <button
          onClick={handleCreate}
          disabled={isConfirming}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
        >
          {isConfirming ? "Creating..." : "Create Split"}
        </button>
      </div>
    </div>
  );
}

function DetailView({
  splitId,
  splitData,
  address,
  handlePay,
  handleRefund,
  handleRelease,
  isConfirming,
}: {
  splitId: number;
  splitData: readonly unknown[];
  address: `0x${string}` | undefined;
  handlePay: (id: number, perPerson: bigint) => void;
  handleRefund: (id: number) => void;
  handleRelease: (id: number) => void;
  isConfirming: boolean;
}) {
  if (!splitData) return null;
  const data = splitData as unknown as [
    string, bigint, bigint, bigint, number, number, boolean, boolean, string, string[], boolean[]
  ];
  if (!data || data.length < 11) return null;

  const [
    creator,
    totalAmount,
    perPerson,
    deadline,
    participantCount,
    paidCount,
    settled,
    refunded,
    title,
    participants,
    paidStatus,
  ] = data;

  const deadlineDate = new Date(Number(deadline) * 1000);
  const isPastDeadline = Date.now() > Number(deadline) * 1000;
  const userIsCreator = address?.toLowerCase() === creator.toLowerCase();
  const userIdx = participants.findIndex((p) => p.toLowerCase() === address?.toLowerCase());
  const userHasPaid = userIdx >= 0 ? paidStatus[userIdx] : false;

  const status = settled ? "✅ Settled" : refunded ? "↩️ Refunded" : isPastDeadline ? "⏰ Past Deadline" : "🔵 Active";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-zinc-500">Split #{splitId}</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${
          settled ? "bg-emerald-950 text-emerald-400" :
          refunded ? "bg-red-950 text-red-400" :
          isPastDeadline ? "bg-amber-950 text-amber-400" :
          "bg-violet-950 text-violet-400"
        }`}>
          {status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          ["Total", `${formatEther(totalAmount)} MON`],
          ["Per Person", `${formatEther(perPerson)} MON`],
          ["Progress", `${paidCount}/${participantCount} paid`],
          ["Deadline", deadlineDate.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="font-semibold text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Participants */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Participants</h3>
        <div className="space-y-1.5">
          {participants.map((p, i) => (
            <div key={p} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                <span className="text-sm font-mono">
                  {p.slice(0, 8)}...{p.slice(-6)}
                </span>
                {p.toLowerCase() === creator.toLowerCase() && (
                  <span className="text-[10px] bg-violet-600/20 text-violet-400 px-1.5 py-0.5 rounded">Creator</span>
                )}
                {p.toLowerCase() === address?.toLowerCase() && (
                  <span className="text-[10px] bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded">You</span>
                )}
              </div>
              <span className={`text-xs font-medium ${paidStatus[i] ? "text-emerald-400" : "text-zinc-600"}`}>
                {paidStatus[i] ? "✓ Paid" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {!settled && !refunded && (
        <div className="space-y-2">
          {/* Release funds — creator only, when at least 2 paid */}
          {userIsCreator && paidCount >= 2 && (
            <button
              onClick={() => handleRelease(splitId)}
              disabled={isConfirming}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {isConfirming ? "Releasing..." : `Release ${formatEther((perPerson as bigint) * BigInt(paidCount))} MON`}
            </button>
          )}
          {userIdx >= 0 && !userHasPaid && !isPastDeadline && (
            <button
              onClick={() => handlePay(splitId, perPerson as bigint)}
              disabled={isConfirming}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {isConfirming ? "Paying..." : `Pay ${formatEther(perPerson as bigint)} MON`}
            </button>
          )}
          {userIdx >= 0 && userHasPaid && isPastDeadline && (
            <button
              onClick={() => handleRefund(splitId)}
              disabled={isConfirming}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {isConfirming ? "Refunding..." : `Refund ${formatEther(perPerson as bigint)} MON`}
            </button>
          )}
          {userIdx >= 0 && userHasPaid && !isPastDeadline && (
            <p className="text-xs text-center text-zinc-600">
              You&apos;ve paid. Waiting for others or deadline to pass.
            </p>
          )}
        </div>
      )}

      {settled && (
        <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-4 text-center">
          <p className="text-emerald-400 font-medium">This split has been settled!</p>
          <p className="text-emerald-600 text-sm mt-1">All participants paid. Funds released to creator.</p>
        </div>
      )}

      {refunded && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-center">
          <p className="text-red-400 font-medium">This split has been refunded.</p>
          <p className="text-red-600 text-sm mt-1">All participants have claimed their refunds.</p>
        </div>
      )}
    </div>
  );
}
