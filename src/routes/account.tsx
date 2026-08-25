import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Cloud,
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AscendrLogo } from "@/components/AscendrLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUrl, isAccountSession, useAuthSession } from "@/lib/authSession";
import { useProfile } from "@/lib/profile";
import { useSubscription } from "@/lib/subscription";

const DEFAULT_DESTINATION = "/home";

type AuthMode = "signup" | "signin";
type ConfirmationType = "signup" | "email_change";
type Feedback =
  | { tone: "confirmation"; email: string; type: ConfirmationType }
  | { tone: "error"; message: string }
  | null;

function safeDestination(value: unknown) {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }
  return DEFAULT_DESTINATION;
}

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: safeDestination(search.next),
  }),
  head: () => ({ meta: [{ title: "Secure your account — Ascendr" }] }),
  component: AccountScreen,
});

function AccountScreen() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const session = useAuthSession();
  const subscription = useSubscription();
  const { profile, updateProfile } = useProfile();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [name, setName] = useState(profile?.name === "Athlete" ? "" : (profile?.name ?? ""));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const isLegacyAnonymousSession = session !== "loading" && session?.isAnonymous === true;
  const destination = useMemo(() => safeDestination(next), [next]);

  useEffect(() => {
    if (!isAccountSession(session) || !subscription.ready) return;
    if (!subscription.active) {
      navigate({ to: "/paywall", search: { source: undefined }, replace: true });
      return;
    }
    window.location.replace(destination);
  }, [destination, navigate, session, subscription.active, subscription.ready]);

  function saveDisplayName() {
    const displayName = name.trim();
    if (displayName && profile) updateProfile({ name: displayName });
  }

  function showError(error: unknown, fallback: string) {
    const message = error instanceof Error && error.message ? error.message : fallback;
    setFeedback({ tone: "error", message });
    toast.error(message);
  }

  async function continueWithEmail() {
    if (!email.trim() || !password) return;
    const normalizedEmail = email.trim().toLowerCase();
    const emailRedirectTo = getAuthRedirectUrl(destination);
    setBusy(true);
    setFeedback(null);

    try {
      if (mode === "signin") {
        if (isLegacyAnonymousSession) await supabase.auth.signOut({ scope: "local" });
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        saveDisplayName();
        return;
      }

      if (isLegacyAnonymousSession) {
        const { data, error } = await supabase.auth.updateUser(
          { email: normalizedEmail, password },
          { emailRedirectTo },
        );
        if (error) throw error;
        saveDisplayName();
        if (data.user.email_confirmed_at) return;
        setFeedback({ tone: "confirmation", email: normalizedEmail, type: "email_change" });
        toast.success("Check your email to finish securing your account.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo,
          data: name.trim() ? { display_name: name.trim() } : undefined,
        },
      });
      if (error) throw error;
      saveDisplayName();
      if (data.session) return;
      if (!data.user) throw new Error("We couldn't create your account. Please try again.");
      setFeedback({ tone: "confirmation", email: normalizedEmail, type: "signup" });
      toast.success("Check your email to finish securing your account.");
    } catch (error) {
      console.error("[account] Email authentication failed", error);
      showError(error, "We couldn't create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    setBusy(true);
    setFeedback(null);
    try {
      const redirectTo = getAuthRedirectUrl(destination);
      const result = isLegacyAnonymousSession
        ? await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } })
        : await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectTo });
      if (result.error) throw result.error;
    } catch (error) {
      console.error("[account] Google sign-in failed", error);
      showError(error, "Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!feedback || feedback.tone !== "confirmation") return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: feedback.type,
        email: feedback.email,
        options: { emailRedirectTo: getAuthRedirectUrl(destination) },
      });
      if (error) throw error;
      toast.success("Confirmation email sent again.");
    } catch (error) {
      console.error("[account] Confirmation resend failed", error);
      showError(error, "We couldn't resend the confirmation email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const processingExistingSession = isAccountSession(session) && !subscription.ready;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_50%_-14%,rgba(183,255,62,0.2),transparent_42%),linear-gradient(180deg,#111c0e_0%,#090b0a_45%,#080a09_100%)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <div className="pointer-events-none absolute -top-28 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-neon/15 blur-3xl" />
      <main className="relative mx-auto flex w-full max-w-md flex-col py-5">
        <header className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <AscendrLogo className="size-11 rounded-[15px] border border-white/10 shadow-[0_12px_30px_-14px_var(--color-neon)]" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neon">
                Ascendr
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Your private fitness system
              </p>
            </div>
          </div>
          <span className="rounded-full border border-neon/20 bg-neon/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-neon">
            Premium unlocked
          </span>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-8 overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025)_62%,rgba(183,255,62,0.09))] p-5 shadow-[0_30px_80px_-45px_black]"
        >
          <div className="flex items-center gap-2 text-neon">
            <span className="grid size-8 place-items-center rounded-xl bg-neon/15">
              <LockKeyhole className="size-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">One last step</span>
          </div>
          <h1 className="mt-5 text-[clamp(2.2rem,10vw,3rem)] font-black leading-[0.94] tracking-[-0.06em]">
            Secure your <span className="text-neon">Ascendr account.</span>
          </h1>
          <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
            Your Premium access, training data, scans, and Coach history stay private and available
            on every device.
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/[0.07] bg-black/20 p-1">
            {(["signup", "signin"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMode(option);
                  setFeedback(null);
                }}
                className={
                  "h-10 rounded-xl text-sm font-bold transition " +
                  (mode === option
                    ? "bg-neon text-neon-foreground shadow-[0_8px_22px_-12px_var(--neon)]"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {option === "signup" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>

          {processingExistingSession ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="size-7 animate-spin text-neon" />
              <p className="text-sm font-semibold">Connecting your Premium access…</p>
            </div>
          ) : feedback?.tone === "confirmation" ? (
            <div
              className="mt-5 rounded-2xl border border-neon/25 bg-neon/[0.07] p-4"
              aria-live="polite"
            >
              <div className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon/15 text-neon">
                  <Check className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold">Confirm your email</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    We sent a secure link to{" "}
                    <span className="font-semibold text-foreground">{feedback.email}</span>. Open it
                    on this iPhone to return directly to Ascendr.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={resendConfirmation}
                className="mt-4 h-10 w-full rounded-full border-white/15 bg-background/60 text-xs"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Resend confirmation email"}
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Display name <span className="normal-case tracking-normal">(optional)</span>
                  </span>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="How should we call you?"
                    autoComplete="name"
                    className="h-12 rounded-2xl border-white/10 bg-black/20"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Email address
                </span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className="h-12 rounded-2xl border-white/10 bg-black/20"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Password
                </span>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="h-12 rounded-2xl border-white/10 bg-black/20 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1 top-1 grid size-10 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              {feedback?.tone === "error" && (
                <p
                  className="rounded-xl border border-destructive/30 bg-destructive/[0.08] px-3 py-2 text-xs leading-relaxed text-destructive"
                  role="alert"
                >
                  {feedback.message}
                </p>
              )}

              <Button
                type="button"
                onClick={continueWithEmail}
                disabled={busy || !email.trim() || !password}
                className="mt-2 h-13 w-full rounded-full bg-neon text-base font-extrabold text-neon-foreground shadow-[0_16px_34px_-16px_var(--neon)] hover:bg-neon/90"
              >
                {busy ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    {mode === "signup" ? "Save my account" : "Continue to Ascendr"}
                    <ArrowRight className="size-5" />
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">
                or
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={continueWithGoogle}
                disabled={busy}
                className="h-12 w-full rounded-full border-white/15 bg-white/[0.045] text-sm font-bold hover:bg-white/[0.08]"
              >
                <Cloud className="size-4 text-neon" /> Continue with Google
              </Button>
            </div>
          )}

          <div className="mt-6 flex items-start gap-2 border-t border-white/[0.07] pt-4 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-neon" />
            <p>
              Your subscription remains linked to this private account. We never store your Apple
              payment details.
            </p>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
