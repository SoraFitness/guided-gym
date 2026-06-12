import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { MessageCircle, Send, Trash2, Loader2, Dumbbell, Apple, BarChart3, User, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useProfile } from "@/lib/profile";
import { buildCoachContext } from "@/lib/coachContext";
import { getCoachThread, clearCoachThread } from "@/lib/coach.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/coach")({
  head: () => ({ meta: [{ title: "AI Coach — Pulse" }] }),
  component: CoachPage,
});

const QUICK_PROMPTS = [
  "Plan my workout today",
  "What should I eat?",
  "Check my progress",
  "Help me hit protein",
  "Make workout easier",
  "Motivate me",
  "Why am I stuck?",
];

function CoachPage() {
  const [session, setSession] = useState<{ userId: string } | null | "loading">("loading");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ? { userId: data.session.user.id } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ? { userId: s.user.id } : null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  if (session === "loading") {
    return (
      <div className="px-5 pt-8 flex justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <CoachSignIn />;
  return <CoachChat />;
}

function CoachSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  async function withEmail() {
    if (!email || !password) return;
    setBusy(true);
    try {
      const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn.call(supabase.auth, {
        email, password,
        ...(mode === "signup" ? { options: { emailRedirectTo: window.location.origin + "/coach" } } : {}),
      } as never);
      if (error) toast.error(error.message);
      else if (mode === "signup") toast.success("Check your email to confirm.");
    } finally { setBusy(false); }
  }

  async function withGoogle() {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/coach",
      });
      if (r.error) toast.error("Google sign-in failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="px-5 pt-8 pb-32 max-w-md mx-auto space-y-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">AI Coach</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to chat with your personal AI fitness coach. Your conversation stays private to you.
        </p>
      </header>
      <div className="rounded-3xl bg-surface p-5 space-y-3 border border-border">
        <Button onClick={withGoogle} disabled={busy} className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90">
          Continue with Google
        </Button>
        <div className="text-xs text-muted-foreground text-center">or</div>
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button onClick={withEmail} disabled={busy} className="w-full h-12 rounded-full bg-neon text-neon-foreground hover:bg-neon/90">
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <button
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="w-full text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have one? Sign in"}
        </button>
      </div>
    </div>
  );
}

function CoachChat() {
  const { profile } = useProfile();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCoachThread()
      .then((res) => {
        setThreadId(res.threadId);
        setInitialMessages(res.messages as unknown as UIMessage[]);
        setLoaded(true);
      })
      .catch((e) => { toast.error("Couldn't load coach"); console.error(e); setLoaded(true); });
  }, []);

  const transport = useMemo(() => {
    if (!threadId) return null;
    return new DefaultChatTransport({
      api: "/api/coach",
      prepareSendMessagesRequest: async ({ messages, body }) => {
        const { data } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
        return {
          headers,
          body: { messages, threadId, userContext: buildCoachContext(profile ?? null), ...body },
        };
      },
    });
  }, [threadId, profile]);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: threadId ?? undefined,
    messages: initialMessages,
    transport: transport ?? new DefaultChatTransport({ api: "/api/coach" }),
    onError: (e) => toast.error(e.message || "Coach is unavailable. Try again."),
  });

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => { inputRef.current?.focus(); }, [threadId, status]);

  async function submit(text: string) {
    const t = text.trim();
    if (!t || !transport || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text: t });
  }

  async function handleClear() {
    if (!threadId) return;
    if (!confirm("Clear this conversation?")) return;
    try {
      await clearCoachThread({ data: { threadId } });
      setMessages([]);
      toast.success("Chat cleared");
    } catch (e) { toast.error("Couldn't clear chat"); console.error(e); }
  }

  const isLoading = status === "submitted" || status === "streaming";
  const isEmpty = loaded && messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-96px)]">
      <header className="px-5 pt-6 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Coach</h1>
          <p className="text-xs text-muted-foreground">Ask anything — workouts, food, progress, motivation</p>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="p-2 rounded-full hover:bg-surface" aria-label="Clear chat">
            <Trash2 className="size-4 text-muted-foreground" />
          </button>
        )}
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
        {!loaded && (
          <div className="flex justify-center pt-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        )}
        {isEmpty && (
          <div className="pt-6 text-center space-y-3">
            <div className="size-16 rounded-2xl bg-neon/15 text-neon mx-auto flex items-center justify-center">
              <MessageCircle className="size-7" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Ask your AI Coach anything — workouts, meals, calories, progress, or motivation.
            </p>
          </div>
        )}
        {messages.map((m) => <MessageBubble key={m.id} message={m} onAction={(text) => submit(text)} />)}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <Loader2 className="size-4 animate-spin" /> Coach is thinking…
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive px-2">Coach is unavailable right now. Please try again.</div>
        )}
      </div>

      {loaded && (
        <div className="border-t border-border bg-background/95 backdrop-blur px-3 pt-3 pb-3 space-y-2">
          {isEmpty && (
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 no-scrollbar">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  className="shrink-0 text-xs px-3 py-2 rounded-full bg-surface border border-border hover:bg-surface-2"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(input); }}
            className="flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your coach…"
              className="flex-1 h-12 rounded-full bg-surface border-border"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="size-12 rounded-full bg-neon text-neon-foreground hover:bg-neon/90 p-0 shrink-0"
              aria-label="Send"
            >
              <Send className="size-5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

interface MsgPart {
  type: string;
  text?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
}

function MessageBubble({ message, onAction }: { message: UIMessage; onAction: (t: string) => void }) {
  const isUser = message.role === "user";
  const parts = (message.parts ?? []) as MsgPart[];
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] space-y-2",
        isUser ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5"
               : "text-foreground",
      )}>
        {parts.map((p, i) => {
          if (p.type === "text") {
            return (
              <div key={i} className={cn("text-sm leading-relaxed prose prose-invert prose-sm max-w-none", isUser && "prose-p:m-0")}>
                <ReactMarkdown>{p.text ?? ""}</ReactMarkdown>
              </div>
            );
          }
          // AI SDK v5+: tool parts have type "tool-<name>" with input/output
          if (p.type?.startsWith("tool-")) {
            const toolName = p.type.slice("tool-".length);
            return <ToolCard key={i} toolName={toolName} output={p.output ?? p.input} onAction={onAction} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolCard({ toolName, output, onAction }: { toolName: string; output: unknown; onAction: (t: string) => void }) {
  const navigate = useNavigate();
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;

  if (toolName === "suggest_workout") {
    const exercises = (o.exercises as { name: string; sets: number; reps: string; notes?: string }[]) ?? [];
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Dumbbell className="size-4 text-neon" /> {String(o.title ?? "Suggested workout")}
        </div>
        <ul className="space-y-1.5 text-sm">
          {exercises.map((ex, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{ex.name}</span>
              <span className="text-muted-foreground">{ex.sets}×{ex.reps}</span>
            </li>
          ))}
        </ul>
        <Button onClick={() => navigate({ to: "/workouts" })} size="sm" className="w-full rounded-full bg-neon text-neon-foreground hover:bg-neon/90">
          Open workouts
        </Button>
      </div>
    );
  }
  if (toolName === "suggest_meal") {
    const options = (o.options as { name: string; kcal: number; proteinG: number; notes?: string }[]) ?? [];
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Apple className="size-4 text-neon" /> Meal ideas
        </div>
        <ul className="space-y-2 text-sm">
          {options.map((m, i) => (
            <li key={i}>
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.kcal} kcal · {m.proteinG}g protein{m.notes ? ` · ${m.notes}` : ""}</div>
            </li>
          ))}
        </ul>
        <Button onClick={() => navigate({ to: "/nutrition" })} size="sm" className="w-full rounded-full bg-neon text-neon-foreground hover:bg-neon/90">
          Log a meal
        </Button>
      </div>
    );
  }
  if (toolName === "open_screen") {
    const screen = String(o.screen ?? "home");
    const label = String(o.label ?? `Open ${screen}`);
    const map: Record<string, { to: string; Icon: typeof Home }> = {
      home: { to: "/home", Icon: Home },
      workouts: { to: "/workouts", Icon: Dumbbell },
      nutrition: { to: "/nutrition", Icon: Apple },
      progress: { to: "/progress", Icon: BarChart3 },
      profile: { to: "/profile", Icon: User },
    };
    const target = map[screen] ?? map.home;
    return (
      <Link
        to={target.to}
        className="inline-flex items-center gap-2 text-sm rounded-full bg-surface border border-border px-4 py-2 hover:bg-surface-2"
      >
        <target.Icon className="size-4 text-neon" /> {label}
      </Link>
    );
  }
  return null;
}
