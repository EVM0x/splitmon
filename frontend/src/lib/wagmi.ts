import { http, createConfig } from "wagmi";
import { monadTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Use wagmi's built-in Monad Testnet if available, else use custom config
export const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(),
  },
});
