import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { UIMessage } from "ai";

// Get (or create) the user's single rolling coach thread + load its messages.
export const getCoachThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("coach_threads")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let threadId = existing?.id as string | undefined;
    if (!threadId) {
      const { data: created, error } = await supabase
        .from("coach_threads")
        .insert({ user_id: userId, title: "Coach" })
        .select("id")
        .single();
      if (error || !created) throw new Error(error?.message ?? "Failed to create thread");
      threadId = created.id;
    }

    const { data: rows, error: msgErr } = await supabase
      .from("coach_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (msgErr) throw new Error(msgErr.message);

    const messages: UIMessage[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      role: r.role as "user" | "assistant" | "system",
      parts: (r.parts as unknown as UIMessage["parts"]) ?? [],
    }));

    return { threadId, messages };
  });

// Delete every message in the user's thread (keeps the thread row).
export const clearCoachThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("coach_messages")
      .delete()
      .eq("thread_id", data.threadId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
