import { createClient } from "@supabase/supabase-js";
import { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { getCsrfToken } from "next-auth/react";
import { SiweMessage } from "siwe";

import { SupabaseAdapter } from "@auth/supabase-adapter";

import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

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
    email: `${address}@placeholder.com`, //user can change this email later.
    user_metadata: { address: address },
  });

  console.log("userSignUpData", userSignUpData);
  
  //insert response into public.users table with id
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
        console.log("START AUTHORIZE");
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

          console.log("credentials", credentials);

          const siwe = new SiweMessage(credentials.message);

          const nonceCsrf = await getCsrfToken({
            req: { headers: req.headers },
          });

          console.log("nonceCsrf", nonceCsrf);

          const isValid = await pubClient.verifySiweMessage({
            address: siwe.address as `0x${string}`,
            message: siwe.prepareMessage(),
            signature: credentials.signature as `0x${string}`,
            nonce: nonceCsrf,
          });

          console.log("SIWE Address:", siwe.address);
          console.log("SIWE Address (typed):", siwe.address as `0x${string}`);
          console.log("Signature Valid:", isValid);

          if (isValid) {
            console.log("Signature Validated!");

            //1. check if the user exists in the database.
            const { data: userExistsData, error: userExistsError } =
              await supabase.from("users").select().eq("address", siwe.address);

            if (userExistsData && userExistsData.length > 0) {
              console.log("User exists in database", userExistsData[0]);
              const userData = userExistsData[0];
              return {
                id: `eip155:${base.id}:${siwe.address}:${userData.id}`,
                name: userData.name,
                email: userData.email,
                userData: userData // Pass the full user data
              };
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

              if (!userId || !address) {
                console.log("No userId or address; returning null.");
                return null;
              }

              return {
                id: `eip155:${base.id}:${address}:${userId}`,
                name: address,
                email: `${address}@placeholder.com`,
              };
            }
          }

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
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.userData = (user as any).userData;
      }
      return token;
    },
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
      
      // Set the user object properties from token
      session.user = {
        ...session.user,
        name: token.name || address,
        email: token.email || `${address}@placeholder.com`,
      };
      
      // Add any additional user data
      if (token.userData) {
        session.userData = token.userData;
      }
      
      return session;
    },
  },
};