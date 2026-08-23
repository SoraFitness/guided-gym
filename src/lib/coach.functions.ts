import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export interface StoredCoachMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: object;
}

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

    const messages: StoredCoachMessage[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      role: r.role as "user" | "assistant" | "system",
      parts: (r.parts ?? []) as object,
    }));

    return { threadId: threadId as string, messages };
  });

// Delete every message in the user's thread (keeps the thread row).
export const clearCoachThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { threadId: string }) => data)
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

export const importCoachMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { messages: StoredCoachMessage[] }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const messages = (data.messages ?? [])
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-100);

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
      threadId = created.id as string;
    }

    if (messages.length > 0) {
      const rows = messages.map((message) => ({
        id: message.id,
        thread_id: threadId,
        user_id: userId,
        role: message.role,
        parts: message.parts as unknown as Json,
      }));
      const { error } = await supabase.from("coach_messages").upsert(rows, {
        onConflict: "id",
      });
      if (error) throw new Error(error.message);
      await supabase
        .from("coach_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
    }

    return { threadId, imported: messages.length };
  });
