import { parseAbi } from "viem";

export const SPLITMON_ABI = parseAbi([
  "function createSplit(address[] participants, uint256 deadline, string title) payable returns (uint256)",
  "function getSplit(uint256 splitId) view returns (address creator, uint256 totalAmount, uint256 perPerson, uint256 deadline, uint8 participantCount, uint8 paidCount, bool settled, bool refunded, string title, address[] participants, bool[] paidStatus)",
  "function hasPaid(uint256 splitId, address participant) view returns (bool)",
  "function isParticipant(uint256 splitId, address participant) view returns (bool)",
  "function payShare(uint256 splitId) payable",
  "function refund(uint256 splitId)",
  "function releaseFunds(uint256 splitId)",
  "function splitCount() view returns (uint256)",
  "event PartialRelease(uint256 indexed splitId, address indexed creator, uint256 amount)",
  "event ParticipantRefunded(uint256 indexed splitId, address indexed participant, uint256 amount)",
  "event PaymentMade(uint256 indexed splitId, address indexed payer, uint256 amount)",
  "event SplitCreated(uint256 indexed splitId, address indexed creator, uint256 totalAmount, uint8 participantCount, uint256 perPerson, uint256 deadline, string title)",
  "event SplitRefunded(uint256 indexed splitId)",
  "event SplitSettled(uint256 indexed splitId, address indexed creator, uint256 amount)",
]);

export const CONTRACT_ADDRESS = "0x4D6e0C8443943a25862B5bB229Aa9dbB8197d92c" as const;

export const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
    public: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
} as const;
