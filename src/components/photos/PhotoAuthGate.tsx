import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { isAccountSession, useAuthSession } from "@/lib/authSession";
import { SoftAccountPrompt } from "@/components/SoftAccountPrompt";

export function PhotoAuthGate({ children }: { children: ReactNode }) {
  const session = useAuthSession();

  if (session === "loading") {
    return (
      <div className="px-5 pt-12 flex justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAccountSession(session)) {
    return (
      <div className="mx-auto max-w-md px-5 pb-32 pt-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Progress Pictures</h1>
          <p className="text-sm text-muted-foreground">
            Create an account to securely save your transformation photos. They stay private to you.
          </p>
        </header>
        <div className="mt-5">
          <SoftAccountPrompt
            title="Save your progress pictures"
            description="Use an email account or Google to back up your photos across devices."
            redirectPath="/photos"
            storageKey="fitness:progress-photos-account-prompt"
            dismissible={false}
            initialExpanded
            initialMode="signin"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
