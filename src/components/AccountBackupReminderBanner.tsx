import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cloud, X } from "lucide-react";
import {
  recordAccountBackupReminderShown,
  shouldShowAccountBackupReminder,
} from "@/lib/accountBackupReminder";

interface AccountBackupReminderBannerProps {
  activeSubscription: boolean;
  authReady: boolean;
  signedIn: boolean;
}

export function AccountBackupReminderBanner({
  activeSubscription,
  authReady,
  signedIn,
}: AccountBackupReminderBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!authReady || signedIn || !activeSubscription || !shouldShowAccountBackupReminder()) {
      setVisible(false);
      return;
    }

    recordAccountBackupReminderShown();
    setVisible(true);
  }, [activeSubscription, authReady, signedIn]);

  if (!visible) return null;

  return (
    <aside
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] mx-auto max-w-md rounded-2xl border border-neon/30 bg-background/95 p-3 shadow-[0_20px_50px_-22px_black] backdrop-blur-xl"
      aria-label="Account backup reminder"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon/15 text-neon">
          <Cloud className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Save all your data</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Create an Ascendr account to back up your plan, progress, and Premium access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label="Remind me later"
        >
          <X className="size-4" />
        </button>
      </div>
      <Link
        to="/profile"
        onClick={() => setVisible(false)}
        className="mt-3 flex h-9 items-center justify-center rounded-full bg-neon px-4 text-xs font-bold text-neon-foreground transition active:scale-[0.98]"
      >
        Save my data
      </Link>
    </aside>
  );
}
