import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

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

const generateNonce = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const nonce = Math.floor(Math.random() * 1000000);

    const { data, error } = await supabase
      .from("users")
      .update({
        auth: {
          genNonce: nonce,
          lastAuth: new Date().toISOString(),
          lastAuthStatus: "pending",
        },
      })
      .eq("address", address);

    if (error) {
      throw error;
    }

    return res.status(200).json({ nonce });
  } catch (error) {
    console.error("Error updating nonce:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default generateNonce;