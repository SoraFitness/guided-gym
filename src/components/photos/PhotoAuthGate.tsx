import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PhotoAuthGate({ children }: { children: ReactNode }) {
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
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (session === "loading") {
    return (
      <div className="px-5 pt-12 flex justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <SignIn />;
  return <>{children}</>;
}

function SignIn() {
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
        email,
        password,
        ...(mode === "signup"
          ? { options: { emailRedirectTo: window.location.origin + "/photos" } }
          : {}),
      } as never);
      if (error) toast.error(error.message);
      else if (mode === "signup") toast.success("Check your email to confirm.");
    } finally {
      setBusy(false);
    }
  }

  async function withGoogle() {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/photos",
      });
      if (r.error) toast.error("Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-8 pb-32 max-w-md mx-auto space-y-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Progress Pictures</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to securely save your transformation photos. They stay private to you.
        </p>
      </header>
      <div className="rounded-3xl bg-surface p-5 space-y-3 border border-border">
        <Button
          onClick={withGoogle}
          disabled={busy}
          className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90"
        >
          Continue with Google
        </Button>
        <div className="text-xs text-muted-foreground text-center">or</div>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          onClick={withEmail}
          disabled={busy}
          className="w-full h-12 rounded-full bg-neon text-neon-foreground hover:bg-neon/90"
        >
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
