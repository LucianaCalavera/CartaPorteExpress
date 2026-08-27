"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createClient());

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error("useSupabase debe usarse dentro de <SupabaseProvider>");
  }
  return client;
}
