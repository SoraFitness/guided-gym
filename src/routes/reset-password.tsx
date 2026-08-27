import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AscendrLogo } from "@/components/AscendrLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { isAccountSession, useAuthSession } from "@/lib/authSession";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Ascendr" }] }),
  component: ResetPasswordScreen,
});

function ResetPasswordScreen() {
  const session = useAuthSession();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function savePassword() {
    if (password.length < 6) {
      setError("Use at least 6 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setError("Your new passwords don't match.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSaved(true);
      toast.success("Your password has been updated.");
    } catch (updateError) {
      console.error("[reset-password] Password update failed", updateError);
      setError("We couldn't update your password. Request a new reset link and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_50%_-14%,rgba(183,255,62,0.2),transparent_42%),linear-gradient(180deg,#111c0e_0%,#090b0a_45%,#080a09_100%)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <div className="pointer-events-none absolute -top-28 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-neon/15 blur-3xl" />
      <main className="relative mx-auto flex w-full max-w-md flex-col py-5">
        <header className="flex items-center gap-2.5 px-1">
          <AscendrLogo className="size-11 rounded-[15px] border border-white/10 shadow-[0_12px_30px_-14px_var(--color-neon)]" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neon">Ascendr</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Your private fitness system</p>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025)_62%,rgba(183,255,62,0.09))] p-5 shadow-[0_30px_80px_-45px_black]">
          <div className="flex items-center gap-2 text-neon">
            <span className="grid size-8 place-items-center rounded-xl bg-neon/15">
              <KeyRound className="size-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure reset</span>
          </div>
          <h1 className="mt-5 text-[clamp(2.2rem,10vw,3rem)] font-black leading-[0.94] tracking-[-0.06em]">
            Choose a new <span className="text-neon">password.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your password is updated securely in Ascendr. You will not be sent to a website.
          </p>

          {session === "loading" ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="size-7 animate-spin text-neon" />
              <p className="text-sm font-semibold">Opening your secure reset link…</p>
            </div>
          ) : !isAccountSession(session) ? (
            <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/[0.08] p-4 text-center">
              <h2 className="text-sm font-bold">This reset link has expired</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Return to Sign in and request a new password reset email.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.replace("/account?mode=signin")}
                className="mt-4 h-10 w-full rounded-full border-white/15 bg-background/60 text-xs"
              >
                Back to Sign in
              </Button>
            </div>
          ) : saved ? (
            <div className="mt-6 rounded-2xl border border-neon/25 bg-neon/[0.07] p-4 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-xl bg-neon/15 text-neon">
                <Check className="size-5" />
              </span>
              <h2 className="mt-3 text-sm font-bold">Password updated</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Your Ascendr account is secure. Continue to return to your app.
              </p>
              <Button
                type="button"
                onClick={() => window.location.replace("/home")}
                className="mt-4 h-11 w-full rounded-full bg-neon font-bold text-neon-foreground hover:bg-neon/90"
              >
                Continue to Ascendr
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  New password
                </span>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="h-12 rounded-2xl border-white/10 bg-black/20 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1 top-1 grid size-10 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide new password" : "Show new password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Confirm new password
                </span>
                <Input
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  className="h-12 rounded-2xl border-white/10 bg-black/20"
                />
              </label>
              {error && (
                <p
                  className="rounded-xl border border-destructive/30 bg-destructive/[0.08] px-3 py-2 text-xs leading-relaxed text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <Button
                type="button"
                onClick={savePassword}
                disabled={busy || !password || !confirmation}
                className="mt-2 h-13 w-full rounded-full bg-neon text-base font-extrabold text-neon-foreground shadow-[0_16px_34px_-16px_var(--neon)] hover:bg-neon/90"
              >
                {busy ? <Loader2 className="size-5 animate-spin" /> : "Save new password"}
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
