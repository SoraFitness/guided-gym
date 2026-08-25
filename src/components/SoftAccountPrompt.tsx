import { useState } from "react";
import { Cloud, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SoftAccountPromptProps {
  title: string;
  description: string;
  redirectPath: string;
  storageKey: string;
  dismissible?: boolean;
  primaryLabel?: string;
  initialExpanded?: boolean;
  initialMode?: "signin" | "signup";
  onSignedIn?: () => void;
}

type ConfirmationState = {
  email: string;
  type: "signup" | "email_change";
};

export function SoftAccountPrompt({
  title,
  description,
  redirectPath,
  storageKey,
  dismissible = true,
  primaryLabel = "Save & sync",
  initialExpanded = false,
  initialMode = "signup",
  onSignedIn,
}: SoftAccountPromptProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible) return false;
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "dismissed";
  });
  const [expanded, setExpanded] = useState(initialExpanded);
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  if (dismissible && dismissed) return null;

  function dismiss() {
    if (!dismissible) return;
    localStorage.setItem(storageKey, "dismissed");
    setDismissed(true);
  }

  async function withGoogle() {
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const result = session?.user.is_anonymous
        ? await supabase.auth.linkIdentity({
            provider: "google",
            options: { redirectTo: window.location.origin + redirectPath },
          })
        : await lovable.auth.signInWithOAuth("google", {
            redirect_uri: window.location.origin + redirectPath,
          });
      if (result.error) toast.error(result.error.message);
    } catch (error) {
      console.error("[auth] Google sign-in failed", error);
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function withEmail() {
    if (!email.trim() || !password) return;
    const normalizedEmail = email.trim().toLowerCase();
    const emailRedirectTo = window.location.origin + redirectPath;
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user.is_anonymous && mode === "signup") {
        const { data, error } = await supabase.auth.updateUser(
          { email: normalizedEmail, password },
          { emailRedirectTo },
        );
        if (error) toast.error(error.message);
        else if (data.user.email_confirmed_at) {
          toast.success("Your Ascendr account is saved.");
          onSignedIn?.();
        } else {
          setConfirmation({ email: normalizedEmail, type: "email_change" });
          toast.success("We sent a confirmation email.");
        }
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo },
        });
        if (error) {
          toast.error(error.message);
        } else if (data.session) {
          toast.success("Your Ascendr account is saved.");
          onSignedIn?.();
        } else if (data.user) {
          setConfirmation({ email: normalizedEmail, type: "signup" });
          toast.success("We sent a confirmation email.");
        } else {
          toast.error("We couldn't create your account. Please try again.");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) toast.error(error.message);
      else {
        toast.success("Welcome back.");
        onSignedIn?.();
      }
    } catch (error) {
      console.error("[auth] Email authentication failed", error);
      toast.error("We couldn't reach account services. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!confirmation) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: confirmation.type,
        email: confirmation.email,
        options: { emailRedirectTo: window.location.origin + redirectPath },
      });
      if (error) toast.error(error.message);
      else toast.success("Confirmation email sent again.");
    } catch (error) {
      console.error("[auth] Confirmation resend failed", error);
      toast.error("We couldn't resend the confirmation email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-neon/20 bg-neon/[0.055] p-4 shadow-[0_18px_50px_-34px_var(--neon)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 place-items-center rounded-2xl bg-neon/15 text-neon">
          <Cloud className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={dismiss}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {!expanded ? (
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setExpanded(true)}
            className={
              dismissible
                ? "h-10 flex-1 rounded-full bg-neon text-neon-foreground hover:bg-neon/90"
                : "h-10 w-full rounded-full bg-neon text-neon-foreground hover:bg-neon/90"
            }
          >
            {primaryLabel}
          </Button>
          {dismissible && (
            <Button
              type="button"
              variant="outline"
              onClick={dismiss}
              className="h-10 rounded-full border-border bg-surface/70"
            >
              Later
            </Button>
          )}
        </div>
      ) : confirmation ? (
        <div
          className="mt-3 rounded-2xl border border-neon/20 bg-background/50 p-3"
          aria-live="polite"
        >
          <p className="text-sm font-semibold">Confirm your email to finish saving your account</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{confirmation.email}</span>. Open it on
            this device to save your account and sync your data.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resendConfirmation}
              disabled={busy}
              className="h-9 flex-1 rounded-full border-border bg-surface/70 text-xs"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Resend email"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmation(null)}
              disabled={busy}
              className="h-9 rounded-full text-xs"
            >
              Use another email
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Button
            type="button"
            onClick={withGoogle}
            disabled={busy}
            className="h-11 w-full rounded-full bg-white text-black hover:bg-white/90"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Continue with Google"}
          </Button>
          <div className="grid grid-cols-1 gap-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 bg-background/70"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 bg-background/70"
            />
          </div>
          <Button
            type="button"
            onClick={withEmail}
            disabled={busy || !email.trim() || !password}
            className="h-11 w-full rounded-full bg-neon text-neon-foreground hover:bg-neon/90"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          <button
            type="button"
            onClick={() => setMode((current) => (current === "signin" ? "signup" : "signin"))}
            className="w-full text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      )}
    </section>
  );
}
