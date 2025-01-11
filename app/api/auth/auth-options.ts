import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { getCsrfToken } from "next-auth/react";
import { SiweMessage } from "siwe";
import { generateSiweNonce, validateSiweMessage } from "viem/siwe";
import { createClient } from "@supabase/supabase-js";

import { SupabaseAdapter } from "@auth/supabase-adapter";
import { useAccount } from "wagmi";

import { createPublicClient, http } from "viem";
import { mainnet, base } from "viem/chains";

//import { insertUser, getUserByWallet } from "@/db/operations/templateuser";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

async function createNewSupabaseUser(address: string, nonceCsrf: string) {
  console.log("user does not exist....");

  //create a user
  const { data: userSignUpData, error } = await supabase.auth.admin.createUser({
    email: `${address}@leap.com`,
    user_metadata: { address: address },
  });

  console.log("userSignUpData", userSignUpData);
  // 5. insert response into public.users table with id

  await supabase.from("users").upsert({
    auth: {
      genNonce: nonceCsrf, // update the nonce, so it can't be reused
      lastAuth: new Date().toISOString(),
      lastAuthStatus: "success",
    },
    id: userSignUpData.user?.id, // same uuid as auth.users table
    address: address,
  });

  return {
    userId: userSignUpData.user?.id,
    address: address,
  };
}

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL ?? "",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  }) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature",
          type: "text",
          placeholder: "0x0",
        },
      },
      async authorize(credentials, req) {
        console.log("test test");
        const pubClient = createPublicClient({
          name: "Base",
          // @ts-ignore: Some Type error no idea
          chain: base,
          transport: http(),
        });

        try {
          if (!credentials) {
            console.log("No credentials; returning null.");
            return null;
          }

          const siwe = new SiweMessage(
            JSON.parse(credentials.message) as SiweMessage
          );

          const nextAuthUrl = new URL(process.env.NEXTAUTH_URL as string);

          const nonceCsrf = await getCsrfToken({
            req: { headers: req.headers },
          });

          const isValid = await pubClient.verifySiweMessage({
            address: siwe.address as `0x${string}`,
            message: siwe.prepareMessage(),
            signature: credentials.signature as `0x${string}`,
            nonce: nonceCsrf,
          });
          //address: siwe.address as `0x${string}`,

          console.log("----siwe.address : \n", siwe.address);
          console.log(
            "----siwe.address as `0x${string}`: \n",
            siwe.address as `0x${string}`
          );
          console.log("----isValid : \n", isValid);

          if (isValid) {
            console.log("Signature Validated!");

            var parsed = JSON.parse(credentials?.message as string);
            //1. check if the user exists in the database.
            const { data: userExistsData, error: userExistsError } =
              await supabase.from("users").select().eq("address", siwe.address);

            if (userExistsData && userExistsData.length > 0) {
              console.log("userExistsData[0].user.id", userExistsData[0]);
              return {
                //chainId, address, userId
                id: `eip155:${base.id}:${siwe.address}:${userExistsData[0].id}`,
              };
              /*
              return {
                id: `eip155:${result.data.chainId}:${result.data.address}:${userExistsData[0]?.id}`,
              };*/
            }
            if (!userExistsData || userExistsData.length < 1) {
              if (!nonceCsrf) {
                console.log("No nonceCsrf; returning null.");
                return null;
              }
              const { userId, address } = await createNewSupabaseUser(
                siwe.address,
                nonceCsrf
              );
              //return null if no user has been created
              if (!userId || !address) {
                console.log("No userId or address; returning null.");
                return null;
              }

              return {
                //chainId, address, userId
                id: `eip155:${base.id}:${address}:${userId}`,
              };
            }
          }

          //const nonce = generateSiweNonce();
          /*
          console.log("parsed will be below:");
          var parsed = JSON.parse(credentials?.message as string);
          console.log(parsed.address);
          console.log(parsed);
          console.log(credentials?.message);

          const result = await siwe.verify({
            signature: credentials?.signature || "",
            domain: nextAuthUrl.host,
            nonce: nonceCsrf,
          });*/

          /*
          if (result.success) {
            console.log("userExistsData967", userExistsData);

            if (!userExistsData || userExistsData.length < 1) {
              console.log("user does not exist....");

              //create a user
              const { data: userSignUpData, error } =
                await supabase.auth.admin.createUser({
                  email: `${parsed.address}@leap.com`,
                  user_metadata: { address: parsed.address },
                });

              console.log("userSignUpData", userSignUpData);
              // 5. insert response into public.users table with id

              await supabase.from("users").upsert({
                auth: {
                  genNonce: nonceCsrf, // update the nonce, so it can't be reused
                  lastAuth: new Date().toISOString(),
                  lastAuthStatus: "success",
                },
                id: userSignUpData.user?.id, // same uuid as auth.users table
                address: parsed.address,
              });

              return {
                id: `eip155:${result.data.chainId}:${result.data.address}:${userSignUpData.user?.id}`,
              };
            }

            //verifiy nonce

            //3.

            console.log(`-------------BREAK-------------`);

            /*let UserRecord = await getUserByWallet(result.data.address || "");
            if (UserRecord.length < 1) {
              UserRecord = await insertUser({
                wallet: result.data.address,
              });
            }*/

          return null;
        } catch (e) {
          console.log("🚀 ~ authorize ~ e:", e);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      console.log("\n CALLBACKS SESSION \n", session, token);
      if (!token.sub) {
        return session;
      }

      session.sub = token.sub;

      const [, chainId, address, userId] = token.sub.split(":");
      session.address = address;
      session.chainId = chainId;
      session.userId = userId;
      return session;
    },
  },
};