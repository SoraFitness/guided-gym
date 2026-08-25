import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Trash2,
  Loader2,
  Dumbbell,
  Apple,
  BarChart3,
  User,
  Home,
  Brain,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useProfile, GOAL_LABELS, EQUIPMENT_LABELS } from "@/lib/profile";
import { buildCoachContext } from "@/lib/coachContext";
import { getCoachThread, clearCoachThread, importCoachMessages } from "@/lib/coach.functions";
import { startAnonymousSession, useAuthSession, type AuthSession } from "@/lib/authSession";
import { cn } from "@/lib/utils";
import { SoftAccountPrompt } from "@/components/SoftAccountPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/coach")({
  head: () => ({ meta: [{ title: "AI Coach — Ascendr" }] }),
  component: CoachPage,
});

const COACH_STARTERS: Array<{
  label: string;
  detail: string;
  prompt: string;
  icon: LucideIcon;
}> = [
  {
    label: "Plan today’s workout",
    detail: "Built around your split and equipment",
    prompt: "Plan my workout today based on my profile and recent progress.",
    icon: Dumbbell,
  },
  {
    label: "Dial in my nutrition",
    detail: "Calories, protein, and meal ideas",
    prompt: "Review my nutrition targets and help me plan what to eat today.",
    icon: Apple,
  },
  {
    label: "Review my progress",
    detail: "Find wins, gaps, and next steps",
    prompt: "Review my recent progress and tell me what I should focus on next.",
    icon: BarChart3,
  },
  {
    label: "Break a plateau",
    detail: "Adjust training and recovery",
    prompt: "I feel stuck. Help me identify why and adjust my plan.",
    icon: Target,
  },
];

const GUEST_MESSAGES_KEY = "fitness:guest-coach-messages";

function CoachPage() {
  const session = useAuthSession();
  const [guestSessionError, setGuestSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (session !== null) return;

    let active = true;
    setGuestSessionError(null);
    void startAnonymousSession().catch((error: unknown) => {
      console.error("[coach] Couldn't start secure guest access", error);
      if (active) {
        setGuestSessionError("Coach is unavailable right now. Please try again later.");
      }
    });

    return () => {
      active = false;
    };
  }, [session]);

  if (session === "loading" || (session === null && !guestSessionError)) {
    return (
      <div className="px-5 pt-8 flex justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="px-5 pt-8">
        <div className="rounded-3xl border border-destructive/25 bg-destructive/[0.06] p-5 text-center">
          <p className="text-sm font-semibold">{guestSessionError}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Check your connection, then reopen Coach.
          </p>
        </div>
      </div>
    );
  }

  return <CoachChat key={session.userId} session={session} />;
}

function readGuestMessages(): UIMessage[] {
  try {
    const raw = localStorage.getItem(GUEST_MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function writeGuestMessages(messages: UIMessage[]) {
  localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(messages));
}

function CoachChat({ session }: { session: AuthSession }) {
  const { profile } = useProfile();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    setLoaded(false);

    const localMessages = readGuestMessages()
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        id: message.id,
        role: message.role,
        parts: message.parts as object,
      }));
    const syncGuestMessages =
      localMessages.length > 0
        ? importCoachMessages({ data: { messages: localMessages } })
            .then((result) => {
              if (result.imported > 0) {
                writeGuestMessages([]);
                toast.success("Coach memory synced");
              }
            })
            .catch((error) => {
              console.error(error);
              toast.error("Couldn't sync guest coach memory yet");
            })
        : Promise.resolve();

    syncGuestMessages
      .then(() => getCoachThread())
      .then((res) => {
        setThreadId(res.threadId);
        setInitialMessages(res.messages as unknown as UIMessage[]);
        setLoaded(true);
      })
      .catch((e) => {
        toast.error("Couldn't load coach");
        console.error(e);
        setLoaded(true);
      });
  }, [session]);

  const transport = useMemo(() => {
    if (!threadId) return null;
    return new DefaultChatTransport({
      api: "/api/coach",
      prepareSendMessagesRequest: ({ messages, body }) => {
        return {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          body: { messages, threadId, userContext: buildCoachContext(profile ?? null), ...body },
        };
      },
    });
  }, [threadId, profile, session]);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: threadId ?? undefined,
    messages: initialMessages,
    transport: transport ?? new DefaultChatTransport({ api: "/api/coach" }),
    onError: (e) => toast.error(e.message || "Coach is unavailable. Try again."),
  });

  useEffect(() => {
    if (!loaded || hydratedRef.current) return;
    setMessages(initialMessages);
    hydratedRef.current = true;
  }, [initialMessages, loaded, setMessages]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status]);

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
    } catch (e) {
      toast.error("Couldn't clear chat");
      console.error(e);
    }
  }

  const isLoading = status === "submitted" || status === "streaming";
  const isEmpty = loaded && messages.length === 0;

  return (
    <div
      className="flex min-h-0 flex-col"
      style={{
        height: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 5.25rem)",
      }}
    >
      <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">
              Ascendr intelligence
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/10 px-2 py-0.5 text-[8px] font-bold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-300" /> Online
            </span>
          </div>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight tracking-[-0.04em]">
            Your AI Coach
          </h1>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {session.isAnonymous
              ? "Guest mode · save an account to back up your coach memory"
              : profile
                ? `${GOAL_LABELS[profile.goal]} · ${EQUIPMENT_LABELS[profile.equipment]} · profile connected`
                : "Ask about training, nutrition, recovery, or progress"}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/[0.06] bg-surface transition active:scale-95"
            aria-label="Clear chat"
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </button>
        )}
      </header>

      {session.isAnonymous && (
        <div className="px-4 pb-3">
          <SoftAccountPrompt
            title="Save your coach memory"
            description="Your coach works now on this device. Create an account later to sync chat history and training context across devices."
            redirectPath="/coach"
            storageKey="fitness:dismiss-coach-account-prompt"
          />
        </div>
      )}

      <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {!loaded && (
          <div className="flex justify-center pt-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {isEmpty && (
          <div className="pt-2">
            <div className="relative overflow-hidden rounded-[28px] border border-neon/20 bg-gradient-to-br from-neon/[0.12] via-surface to-surface p-5">
              <div className="absolute -right-10 -top-10 size-32 rounded-full bg-neon/10 blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-neon text-neon-foreground shadow-[0_0_28px_-12px_var(--color-neon)]">
                  <Brain className="size-6" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">
                    Your plan, understood
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold leading-tight">
                    What are we solving today
                    {profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}?
                  </h2>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/60">
                    I can use your goals, schedule, equipment, nutrition targets, and recent logs to
                    give you a specific next step.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {COACH_STARTERS.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => submit(starter.prompt)}
                    className="min-h-[118px] rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-3.5 text-left transition active:scale-[0.98] active:border-neon/25"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-neon/10 text-neon">
                      <Icon className="size-[17px]" />
                    </span>
                    <span className="mt-3 block text-[12px] font-bold leading-tight">
                      {starter.label}
                    </span>
                    <span className="mt-1 block text-[9px] leading-relaxed text-muted-foreground">
                      {starter.detail}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onAction={(text) => submit(text)} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <Loader2 className="size-4 animate-spin" /> Coach is thinking…
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive px-2">
            Coach is unavailable right now. Please try again.
          </div>
        )}
      </div>

      {loaded && (
        <div className="space-y-2 border-t border-white/[0.06] bg-background/95 px-3 pb-3 pt-3 backdrop-blur-xl">
          {!isEmpty && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
              {COACH_STARTERS.slice(0, 3).map((starter) => (
                <button
                  key={starter.label}
                  onClick={() => submit(starter.prompt)}
                  className="shrink-0 rounded-full border border-white/[0.06] bg-surface px-3 py-2 text-[10px] font-semibold"
                >
                  {starter.label}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neon" />
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Ascendr anything…"
                className="h-12 rounded-full border-white/[0.07] bg-surface pl-11 pr-4"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="size-12 shrink-0 rounded-full bg-neon p-0 text-neon-foreground shadow-[0_12px_28px_-14px_var(--color-neon)] hover:bg-neon/90"
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

function MessageBubble({
  message,
  onAction,
}: {
  message: UIMessage;
  onAction: (t: string) => void;
}) {
  const isUser = message.role === "user";
  const parts = (message.parts ?? []) as MsgPart[];
  return (
    <div className={cn("flex items-start gap-2.5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-neon text-neon-foreground">
          <Brain className="size-4" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] space-y-2",
          isUser
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5"
            : "rounded-2xl rounded-tl-md border border-white/[0.055] bg-surface px-4 py-3 text-foreground",
        )}
      >
        {parts.map((p, i) => {
          if (p.type === "text") {
            return (
              <div
                key={i}
                className={cn(
                  "text-sm leading-relaxed prose prose-invert prose-sm max-w-none",
                  isUser && "prose-p:m-0",
                )}
              >
                <ReactMarkdown>{p.text ?? ""}</ReactMarkdown>
              </div>
            );
          }
          // AI SDK v5+: tool parts have type "tool-<name>" with input/output
          if (p.type?.startsWith("tool-")) {
            const toolName = p.type.slice("tool-".length);
            return (
              <ToolCard
                key={i}
                toolName={toolName}
                output={p.output ?? p.input}
                onAction={onAction}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolCard({
  toolName,
  output,
  onAction,
}: {
  toolName: string;
  output: unknown;
  onAction: (t: string) => void;
}) {
  const navigate = useNavigate();
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;

  if (toolName === "suggest_workout") {
    const exercises =
      (o.exercises as { name: string; sets: number; reps: string; notes?: string }[]) ?? [];
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Dumbbell className="size-4 text-neon" /> {String(o.title ?? "Suggested workout")}
        </div>
        <ul className="space-y-1.5 text-sm">
          {exercises.map((ex, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{ex.name}</span>
              <span className="text-muted-foreground">
                {ex.sets}×{ex.reps}
              </span>
            </li>
          ))}
        </ul>
        <Button
          onClick={() => navigate({ to: "/workouts" })}
          size="sm"
          className="w-full rounded-full bg-neon text-neon-foreground hover:bg-neon/90"
        >
          Open workouts
        </Button>
      </div>
    );
  }
  if (toolName === "suggest_meal") {
    const options =
      (o.options as { name: string; kcal: number; proteinG: number; notes?: string }[]) ?? [];
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Apple className="size-4 text-neon" /> Meal ideas
        </div>
        <ul className="space-y-2 text-sm">
          {options.map((m, i) => (
            <li key={i}>
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground">
                {m.kcal} kcal · {m.proteinG}g protein{m.notes ? ` · ${m.notes}` : ""}
              </div>
            </li>
          ))}
        </ul>
        <Button
          onClick={() => navigate({ to: "/nutrition" })}
          size="sm"
          className="w-full rounded-full bg-neon text-neon-foreground hover:bg-neon/90"
        >
          Log a meal
        </Button>
      </div>
    );
  }
  if (toolName === "remember") {
    if ((o as { saved?: boolean }).saved === false) return null;
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Brain className="size-3.5 text-neon" /> Saved to coach memory
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
