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
}

export function SoftAccountPrompt({
  title,
  description,
  redirectPath,
  storageKey,
  dismissible = true,
  primaryLabel = "Save & sync",
}: SoftAccountPromptProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible) return false;
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "dismissed";
  });
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (dismissible && dismissed) return null;

  function dismiss() {
    if (!dismissible) return;
    localStorage.setItem(storageKey, "dismissed");
    setDismissed(true);
  }

  async function withGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + redirectPath,
      });
      if (result.error) toast.error("Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function withEmail() {
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn.call(supabase.auth, {
        email: email.trim(),
        password,
        ...(mode === "signup"
          ? { options: { emailRedirectTo: window.location.origin + redirectPath } }
          : {}),
      } as never);
      if (error) toast.error(error.message);
      else if (mode === "signup") toast.success("Check your email to confirm.");
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
