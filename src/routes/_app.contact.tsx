import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  LifeBuoy,
  Mail,
  MessageSquareText,
  Send,
} from "lucide-react";

import { useProfile } from "@/lib/profile";

const SUPPORT_EMAIL = "help@ascendr.org";

const SUPPORT_TOPICS = [
  { value: "General question", label: "General question" },
  { value: "Account and billing", label: "Account & billing" },
  { value: "Face or body scan", label: "Face or body scan" },
  { value: "AI Coach", label: "AI Coach" },
  { value: "Workouts", label: "Workouts" },
  { value: "Nutrition", label: "Nutrition" },
  { value: "Bug report", label: "Report a bug" },
  { value: "Feedback", label: "Product feedback" },
] as const;

export const Route = createFileRoute("/_app/contact")({
  head: () => ({ meta: [{ title: "Contact Support — Ascendr" }] }),
  component: ContactPage,
});

function ContactPage() {
  const { profile } = useProfile();
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof SUPPORT_TOPICS)[number]["value"]>("General question");
  const [message, setMessage] = useState("");
  const [attempted, setAttempted] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const formValid = name.trim().length >= 2 && emailValid && message.trim().length >= 10;

  function openEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (!formValid) return;

    const subject = encodeURIComponent(`[Ascendr Support] ${topic}`);
    const body = encodeURIComponent(
      [
        `Name: ${name.trim()}`,
        `Reply email: ${email.trim()}`,
        `Topic: ${topic}`,
        "",
        message.trim(),
        "",
        "Sent from the Ascendr app.",
      ].join("\n"),
    );

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="px-4 pb-32 pt-5 animate-slide-up sm:px-5">
      <header className="flex items-center gap-3 px-1">
        <Link
          to="/profile"
          aria-label="Back to profile"
          className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.06] bg-surface transition active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">
            Ascendr support
          </p>
          <h1 className="mt-0.5 text-[26px] font-extrabold leading-tight tracking-[-0.04em]">
            How can we help?
          </h1>
        </div>
      </header>

      <section className="relative mt-5 overflow-hidden rounded-[28px] border border-neon/20 bg-gradient-to-br from-neon/[0.12] via-surface to-surface p-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-neon/10 blur-3xl" />
        <div className="relative flex items-start gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-neon text-neon-foreground shadow-[0_0_28px_-12px_var(--color-neon)]">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <h2 className="font-bold">Talk to a real person</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Share what is going on and your email app will prepare a message for our support team.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-neon"
            >
              {SUPPORT_EMAIL}
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      <form onSubmit={openEmail} noValidate className="mt-5 space-y-3.5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <FormField label="Your name" error={attempted && name.trim().length < 2}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={80}
              placeholder="Your name"
              className="h-12 w-full bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/55"
            />
          </FormField>

          <FormField label="Reply email" error={attempted && !emailValid}>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={120}
              placeholder="you@example.com"
              className="h-12 w-full bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/55"
            />
          </FormField>
        </div>

        <FormField label="What do you need help with?">
          <div className="relative">
            <select
              value={topic}
              onChange={(event) =>
                setTopic(event.target.value as (typeof SUPPORT_TOPICS)[number]["value"])
              }
              className="h-12 w-full appearance-none bg-transparent px-4 pr-11 text-sm outline-none"
            >
              {SUPPORT_TOPICS.map((option) => (
                <option key={option.value} value={option.value} className="bg-background">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </FormField>

        <FormField label="Message" error={attempted && message.trim().length < 10}>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            rows={6}
            placeholder="Tell us what happened and what you expected to see…"
            className="min-h-36 w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/55"
          />
          <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2 text-[10px] text-muted-foreground">
            <span>{message.trim().length < 10 ? "At least 10 characters" : "Ready to send"}</span>
            <span className="tabular-nums">{message.length}/2000</span>
          </div>
        </FormField>

        {attempted && !formValid && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] px-3.5 py-3 text-xs text-amber-100/90">
            <Bug className="mt-0.5 size-4 shrink-0 text-amber-300" />
            Add your name, a valid reply email, and a short description before continuing.
          </div>
        )}

        <button
          type="submit"
          className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-neon text-sm font-semibold text-neon-foreground shadow-[0_14px_40px_-18px_var(--color-neon)] transition active:scale-[0.98]"
        >
          <Send className="size-4" />
          Continue to email
        </button>
      </form>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3.5">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-neon" />
        <div>
          <p className="text-xs font-semibold">Your message stays in your control</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            We will open your email app with the details filled in. Review the message, attach any
            helpful screenshots, then tap Send.
          </p>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  error = false,
  children,
}: {
  label: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`block overflow-hidden rounded-2xl border bg-surface transition-colors ${
        error ? "border-destructive/55" : "border-white/[0.07] focus-within:border-neon/45"
      }`}
    >
      <span className="flex items-center gap-1.5 px-4 pt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label === "Message" ? (
          <MessageSquareText className="size-3 text-neon" />
        ) : label === "Reply email" ? (
          <Mail className="size-3 text-neon" />
        ) : null}
        {label}
      </span>
      {children}
    </label>
  );
}
