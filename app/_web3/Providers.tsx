"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
    RainbowKitProvider,
    midnightTheme
} from "@rainbow-me/rainbowkit";
import {
    GetSiweMessageOptions,
    RainbowKitSiweNextAuthProvider,
} from "@rainbow-me/rainbowkit-siwe-next-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { WagmiProvider } from "wagmi";
import { config } from "./config";


const queryClient = new QueryClient();

const getSiweMessageOptions: GetSiweMessageOptions = () => ({
  statement:
    "Our application use Sign-in With Ethereum to establish a secure session with our servers, opposed to usernames and passwords. Please sign in to continue.",
});

export function Providers({ children }: { children: JSX.Element }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider refetchInterval={0}>
          <RainbowKitSiweNextAuthProvider
            getSiweMessageOptions={getSiweMessageOptions}
          >
            <RainbowKitProvider
              theme={midnightTheme({
                accentColor: "#8391f6",
                accentColorForeground: "#e1e8fe",
                borderRadius: "medium",
                overlayBlur: "small",
                fontStack: "system",
              })}
              modalSize="compact"
            >
              {children}
            </RainbowKitProvider>
          </RainbowKitSiweNextAuthProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}