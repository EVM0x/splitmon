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

  const [view, setView] = useState<"swap" | "create" | "detail">("swap");
  const [splitId, setSplitId] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [createdSplitId, setCreatedSplitId] = useState<number | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash || undefined });

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
      setError("Failed to connect wallet");
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

    const totalPeople = participantList.length + 1;
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
      } catch { /* ignore */ }
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
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-fuchsia-500/6 blur-[80px]" />
      </div>

      {/* Header — DEX style */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-xl bg-[#0a0a0f]/70">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-500/20">
                S
              </div>
              <span className="text-lg font-bold tracking-tight">SplitMon</span>
            </div>
            <nav className="hidden sm:flex gap-1 bg-white/[0.03] rounded-xl p-1 backdrop-blur-sm border border-white/[0.06]">
              {[
                ["swap", "Swap"],
                ["create", "Create Split"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v as "swap" | "create")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    view === v
                      ? "bg-white/[0.08] text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  <span className="text-xs font-mono text-zinc-300">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="relative overflow-hidden bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm px-5 py-2 rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications */}
      {(error || successMsg) && (
        <div className="relative z-10 max-w-5xl mx-auto px-6 mt-4">
          <div
            className={`p-4 rounded-2xl text-sm backdrop-blur-xl border ${
              error
                ? "bg-red-500/5 border-red-500/20 text-red-300"
                : "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
            }`}
          >
            {error || successMsg}
            <button className="ml-3 underline opacity-60 hover:opacity-100" onClick={() => { setError(""); setSuccessMsg(""); }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {txHash && (
        <div className="relative z-10 max-w-5xl mx-auto px-6 mt-2 text-xs text-zinc-600">
          Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)} {isConfirming ? "(confirming...)" : isConfirmed ? "✓ confirmed" : ""}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 max-w-[480px] mx-auto w-full px-4 py-12">
        {view === "swap" && <SwapView splitCount={splitCount} splitId={splitId} setSplitId={setSplitId} handleViewSplit={handleViewSplit} setView={setView} />}
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
    </div>
  );
}

// ==================== SWAP VIEW (Home) ====================
function SwapView({
  splitCount,
  splitId,
  setSplitId,
  handleViewSplit,
  setView,
}: {
  splitCount: bigint | undefined;
  splitId: number;
  setSplitId: (n: number) => void;
  handleViewSplit: (e: React.FormEvent) => void;
  setView: (v: "swap" | "create" | "detail") => void;
}) {
  return (
    <div className="space-y-6">
      {/* Hero card — DEX swap card style */}
      <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl p-8">
        {/* Card glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Split Bills
              </span>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Onchain bill splitter on Monad</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/[0.06] flex items-center justify-center text-2xl">
            💸
          </div>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Create a split, invite friends, and let the smart contract handle the rest. Everyone pays their share — or gets refunded if the deadline passes.
        </p>

        <button
          onClick={() => setView("create")}
          className="w-full relative overflow-hidden bg-gradient-to-r from-violet-500 to-cyan-500 text-white py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/20 hover:scale-[1.01] active:scale-[0.99]"
        >
          Create a Split
        </button>

        {/* Stats row */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/[0.06]">
          <div className="text-center flex-1">
            <div className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              {splitCount !== undefined ? Number(splitCount) : "—"}
            </div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Total Splits</div>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div className="text-center flex-1">
            <div className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              ~2s
            </div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Settlement</div>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div className="text-center flex-1">
            <div className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              100%
            </div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Onchain</div>
          </div>
        </div>
      </div>

      {/* View split card */}
      <div className="rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">View a Split</h3>
        <form onSubmit={handleViewSplit} className="flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="Enter Split ID"
            value={splitId || ""}
            onChange={(e) => setSplitId(parseInt(e.target.value) || 0)}
            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            type="submit"
            className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-all"
          >
            View
          </button>
        </form>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: "1", icon: "⚡", title: "Create", desc: "Set amount & add friends" },
          { step: "2", icon: "📤", title: "Share", desc: "Give friends the Split ID" },
          { step: "3", icon: "✅", title: "Settle", desc: "Auto-release when all pay" },
        ].map((s) => (
          <div key={s.step} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 text-center backdrop-blur-sm">
            <div className="text-xl mb-2">{s.icon}</div>
            <h4 className="font-semibold text-xs mb-1">{s.title}</h4>
            <p className="text-[10px] text-zinc-500 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== CREATE VIEW ====================
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
      <div className="rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl p-10 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <p className="text-zinc-400 text-sm">Connect your wallet to create a split</p>
      </div>
    );
  }

  const inputClass = "w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all duration-200 hover:border-white/[0.12]";
  const labelClass = "block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider";

  return (
    <div className="rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl p-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" style={{position:"relative"}} />
      <h2 className="text-xl font-bold mb-6">Create Split</h2>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input type="text" placeholder="Dinner at Sushi Place 🍣" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Total Amount (MON)</label>
          <div className="relative">
            <input type="number" step="0.001" placeholder="0.03" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className={inputClass + " pr-16"} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">MON</span>
          </div>
        </div>

        <div>
          <label className={labelClass}>Friends&apos; Addresses</label>
          <textarea
            placeholder="0xAbC...123, 0xDeF...456"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            rows={3}
            className={inputClass + " resize-none"}
          />
          <p className="text-[10px] text-zinc-600 mt-1">Comma-separated Monad addresses (max 20)</p>
        </div>

        <div>
          <label className={labelClass}>Deadline</label>
          <select value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} className={inputClass}>
            {[1, 2, 4, 8, 12, 24, 48, 72, 168].map((h) => (
              <option key={h} value={h}>{h} hour{h > 1 ? "s" : ""}</option>
            ))}
          </select>
          <p className="text-[10px] text-zinc-600 mt-1">After deadline, participants can refund if not fully paid</p>
        </div>

        <button
          onClick={handleCreate}
          disabled={isConfirming}
          className="w-full relative overflow-hidden bg-gradient-to-r from-violet-500 to-cyan-500 text-white py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isConfirming ? "Creating..." : "Create Split"}
        </button>
      </div>
    </div>
  );
}

// ==================== DETAIL VIEW ====================
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
    creator, totalAmount, perPerson, deadline, participantCount, paidCount,
    settled, refunded, title, participants, paidStatus,
  ] = data;

  const deadlineDate = new Date(Number(deadline) * 1000);
  const isPastDeadline = Date.now() > Number(deadline) * 1000;
  const userIsCreator = address?.toLowerCase() === creator.toLowerCase();
  const userIdx = participants.findIndex((p) => p.toLowerCase() === address?.toLowerCase());
  const userHasPaid = userIdx >= 0 ? paidStatus[userIdx] : false;

  const status = settled ? "Settled" : refunded ? "Refunded" : isPastDeadline ? "Past Deadline" : "Active";

  const statusColor = settled
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : refunded
    ? "text-red-400 bg-red-500/10 border-red-500/20"
    : isPastDeadline
    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-violet-400 bg-violet-500/10 border-violet-500/20";

  return (
    <div className="rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-xs text-zinc-600 mt-0.5">Split #{splitId} · {participantCount} participants</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${statusColor}`}>
          {status}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
          <span>Progress</span>
          <span>{paidCount}/{participantCount} paid</span>
        </div>
        <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${(paidCount / participantCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Total", `${formatEther(totalAmount)} MON`],
          ["Per Person", `${formatEther(perPerson)} MON`],
          ["Deadline", deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })],
          ["Creator", `${creator.slice(0, 6)}...${creator.slice(-4)}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</p>
            <p className="font-semibold text-sm mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Participants */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Participants</h3>
        <div className="space-y-1">
          {participants.map((p, i) => (
            <div key={p} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  paidStatus[i] ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.04] text-zinc-600"
                }`}>
                  {i + 1}
                </div>
                <span className="text-xs font-mono text-zinc-400">{p.slice(0, 6)}...{p.slice(-4)}</span>
                {p.toLowerCase() === creator.toLowerCase() && (
                  <span className="text-[9px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded-md font-medium">Creator</span>
                )}
                {p.toLowerCase() === address?.toLowerCase() && (
                  <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded-md font-medium">You</span>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${paidStatus[i] ? "text-emerald-400" : "text-zinc-700"}`}>
                {paidStatus[i] ? "Paid ✓" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {!settled && !refunded && (
        <div className="space-y-2">
          {userIsCreator && paidCount >= 2 && (
            <button onClick={() => handleRelease(splitId)} disabled={isConfirming}
              className="w-full relative overflow-hidden bg-gradient-to-r from-violet-500 to-cyan-500 text-white py-3 rounded-2xl font-semibold text-sm transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50">
              {isConfirming ? "Releasing..." : `Release ${formatEther((perPerson as bigint) * BigInt(paidCount))} MON`}
            </button>
          )}
          {userIdx >= 0 && !userHasPaid && !isPastDeadline && (
            <button onClick={() => handlePay(splitId, perPerson as bigint)} disabled={isConfirming}
              className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-3 rounded-2xl font-semibold text-sm transition-all hover:bg-emerald-500/20 disabled:opacity-50">
              {isConfirming ? "Paying..." : `Pay ${formatEther(perPerson as bigint)} MON`}
            </button>
          )}
          {userIdx >= 0 && userHasPaid && isPastDeadline && (
            <button onClick={() => handleRefund(splitId)} disabled={isConfirming}
              className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-400 py-3 rounded-2xl font-semibold text-sm transition-all hover:bg-amber-500/20 disabled:opacity-50">
              {isConfirming ? "Refunding..." : `Refund ${formatEther(perPerson as bigint)} MON`}
            </button>
          )}
          {userIdx >= 0 && userHasPaid && !isPastDeadline && (
            <p className="text-[10px] text-center text-zinc-600 py-2">You&apos;ve paid. Waiting for others or deadline to pass.</p>
          )}
        </div>
      )}

      {settled && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-emerald-400 font-semibold text-sm">✓ This split has been settled!</p>
          <p className="text-emerald-600 text-xs mt-1">All participants paid. Funds released to creator.</p>
        </div>
      )}

      {refunded && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-red-400 font-semibold text-sm">↩ This split has been refunded.</p>
          <p className="text-red-600 text-xs mt-1">All participants have claimed their refunds.</p>
        </div>
      )}
    </div>
  );
}
