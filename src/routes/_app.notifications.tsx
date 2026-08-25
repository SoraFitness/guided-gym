import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/weeklyReport.functions";
import { isAccountSession, isGuestSession, useAuthSession } from "@/lib/authSession";
import { useSubscription } from "@/lib/subscription";
import {
  hasUnreadAccountBackupNotification,
  markAccountBackupNotificationRead,
} from "@/lib/accountBackupReminder";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Ascendr" }] }),
  component: NotificationsPage,
  errorComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Couldn't load notifications.</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function NotificationsPage() {
  const session = useAuthSession();
  const subscription = useSubscription();
  const signedIn = isAccountSession(session);
  const [accountBackupUnread, setAccountBackupUnread] = useState(() =>
    hasUnreadAccountBackupNotification(),
  );
  const list = useServerFn(listNotifications);
  const markAll = useServerFn(markAllNotificationsRead);
  const markOne = useServerFn(markNotificationRead);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
    enabled: signedIn,
  });
  const showAccountBackupNotification = isGuestSession(session) && subscription.active;
  const hasNotifications = showAccountBackupNotification || (data?.length ?? 0) > 0;

  async function markAllRead() {
    if (signedIn) {
      await markAll();
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (showAccountBackupNotification) {
      markAccountBackupNotificationRead();
      setAccountBackupUnread(false);
    }
  }

  function markAccountBackupRead() {
    markAccountBackupNotificationRead();
    setAccountBackupUnread(false);
  }

  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <header className="flex items-center justify-between mb-5">
        <Link
          to="/home"
          aria-label="Back to home"
          className="size-9 rounded-full bg-surface grid place-items-center"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-bold">Notifications</h1>
        <button
          onClick={async () => {
            await markAllRead();
          }}
          className="size-9 rounded-full bg-surface grid place-items-center"
          aria-label="Mark all read"
        >
          <CheckCheck className="size-4" />
        </button>
      </header>
      {signedIn && isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasNotifications ? (
        <div className="rounded-3xl bg-surface p-8 text-center">
          <Bell className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {showAccountBackupNotification && (
            <li>
              <Link
                to="/profile"
                onClick={markAccountBackupRead}
                className={
                  "block rounded-2xl border p-4 " +
                  (accountBackupUnread
                    ? "bg-neon/5 border-neon/20"
                    : "bg-surface border-white/[0.05]")
                }
              >
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-neon/10 grid place-items-center shrink-0">
                    <Bell className="size-4 text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">Save all your data</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">
                      Create an account to back up your plan, progress, and Premium access.
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1.5">Action needed</div>
                  </div>
                </div>
              </Link>
            </li>
          )}
          {(data ?? []).map((n) => (
            <li key={n.id as string}>
              <Link
                to={(n.link_to as string | null) ?? "/home"}
                onClick={async () => {
                  if (!n.read_at) {
                    await markOne({ data: { id: n.id as string } });
                    qc.invalidateQueries({ queryKey: ["notifications"] });
                  }
                }}
                className={
                  "block rounded-2xl border p-4 " +
                  (n.read_at ? "bg-surface border-white/[0.05]" : "bg-neon/5 border-neon/20")
                }
              >
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-full bg-neon/10 grid place-items-center shrink-0">
                    <Bell className="size-4 text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{n.title as string}</div>
                    {n.body && (
                      <div className="text-[12px] text-muted-foreground mt-0.5">
                        {n.body as string}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1.5">
                      {new Date(n.created_at as string).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
