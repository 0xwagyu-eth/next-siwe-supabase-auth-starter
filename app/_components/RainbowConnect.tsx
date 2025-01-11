"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet } from "lucide-react"; // Assuming you're using lucide-react for icons
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { formatEthAddress } from "@/lib/utils"; // You'll need to move/create this utility

export default function RainbowConnect() {
  const session = useSession();
  console.log(session, "SESSION");

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <div className="flex gap-2">
                    <Button onClick={openConnectModal} type="button">
                      Connect Wallet
                    </Button>
                  </div>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="destructive">
                    Wrong network
                  </Button>
                );
              }

              if (!session) {
                return <Button>Sign In</Button>;
              }

              return (
                <div className="flex gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex gap-2">
                        <span className="text-sm font-medium">
                          {account.displayName}
                        </span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={session?.data?.user?.image || "https://i.seadn.io/s/raw/files/469b3e5d68a998340037173c9ea6317c.png?auto=format&dpr=1&w=1000"
                            }
                            alt="Profile"
                          />
                        </Avatar>
                        <Wallet className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[250px]">
                      <div className="px-2 pb-2">
                        <p className="text-xs opacity-80">Welcome</p>
                      </div>
                      
                      <DropdownMenuItem asChild>
                        <Link href={`/user/${'userProfile'}`} className="flex items-start gap-2 p-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={session?.data?.user?.image || "https://i.seadn.io/s/raw/files/469b3e5d68a998340037173c9ea6317c.png?auto=format&dpr=1&w=1000"
                              }
                              alt="Profile"
                            />
                          </Avatar>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{session?.data?.user?.name || 'Friend'}</span>
                            <span className="text-xs">{formatEthAddress(account.address || '0x')}</span>
                            <span className="text-xs">
                              {account.displayBalance
                                ? ` (${account.displayBalance})`
                                : ""}
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={openAccountModal}>
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}