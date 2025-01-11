import { base, baseSepolia, sepolia } from "wagmi/chains";

const chains =
  parseInt(String(process.env.NEXT_PUBLIC_CHAINS_IN_DEV_MODE)) === 1
    ? ([sepolia, baseSepolia] as const)
    : ([base] as const);

const validChain = (id: Number) => {
  const allowedChains =
    parseInt(String(process.env.NEXT_PUBLIC_CHAINS_IN_DEV_MODE)) === 1
      ? ([sepolia, baseSepolia] as const)
      : ([base] as const);

  if (Number(allowedChains[0].id) === id) {
    return true;
  } else {
    return false;
  }
};

export { chains, validChain };
