export const SPLITMON_ABI = [
  {
    "inputs": [
      { "internalType": "address[]", "name": "_participants", "type": "address[]" },
      { "internalType": "uint256", "name": "_deadline", "type": "uint256" },
      { "internalType": "string", "name": "_title", "type": "string" }
    ],
    "name": "createSplit",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_splitId", "type": "uint256" }
    ],
    "name": "payShare",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_splitId", "type": "uint256" }
    ],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_splitId", "type": "uint256" }
    ],
    "name": "getSplit",
    "outputs": [
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "perPerson", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint8", "name": "participantCount", "type": "uint8" },
      { "internalType": "uint8", "name": "paidCount", "type": "uint8" },
      { "internalType": "bool", "name": "settled", "type": "bool" },
      { "internalType": "bool", "name": "refunded", "type": "bool" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "address[]", "name": "participants", "type": "address[]" },
      { "internalType": "bool[]", "name": "paidStatus", "type": "bool[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "splitCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "splitId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "participantCount", "type": "uint8" },
      { "indexed": false, "internalType": "uint256", "name": "perPerson", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "title", "type": "string" }
    ],
    "name": "SplitCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "splitId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "payer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "PaymentMade",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "splitId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "SplitSettled",
    "type": "event"
  }
] as const;

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
