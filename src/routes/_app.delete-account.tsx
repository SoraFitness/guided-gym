import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2, Mail, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { supabase } from "@/integrations/supabase/client";
import { deleteAscendrAccount } from "@/lib/account.functions";
import { useAuthSession } from "@/lib/authSession";
import { useProfile } from "@/lib/profile";

const DELETE_REQUEST_URL =
  "mailto:help@ascendr.org?subject=Ascendr%20Account%20Deletion%20Request&body=Hello%20Ascendr%20Support%2C%0A%0AI%20would%20like%20to%20delete%20my%20Ascendr%20account.%0A%0AAccount%20email%3A%20%0A%0AThank%20you.";

export const Route = createFileRoute("/_app/delete-account")({
  head: () => ({ meta: [{ title: "Delete Account — Ascendr" }] }),
  component: DeleteAccountPage,
});

function clearLocalAscendrData() {
  const prefixes = ["fitness:", "ascendr_", "ascendr-"];
  for (const key of Object.keys(localStorage)) {
    if (prefixes.some((prefix) => key.startsWith(prefix)) || key.startsWith("sb-")) {
      localStorage.removeItem(key);
    }
  }
  sessionStorage.clear();
}

function DeleteAccountPage() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const { setProfile } = useProfile();
  const removeAccount = useServerFn(deleteAscendrAccount);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDeletion() {
    if (!session || session === "loading" || deleting) return;
    setDeleting(true);
    try {
      await removeAccount();
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setProfile(null);
      clearLocalAscendrData();
      toast.success("Your Ascendr account was deleted");
      navigate({ to: "/onboarding", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Account deletion failed";
      toast.error(
        message.includes("not configured")
          ? "Direct deletion is temporarily unavailable. Use the email option below."
          : "Your account could not be deleted. Nothing was changed.",
      );
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <LegalPage
        eyebrow="Account controls"
        title="Delete your account"
        introduction="Permanently remove your Ascendr account and its associated personal information. Signing out or resetting the local profile does not delete your cloud account."
      >
        <LegalSection title="What deletion covers">
          <LegalList>
            <li>Your Ascendr account and cloud profile.</li>
            <li>
              Saved workout, nutrition, Coach, progress, and scan records tied to the account.
            </li>
            <li>Uploaded face, body, and progress photos retained with the account.</li>
          </LegalList>
          <p>
            Limited information may be retained when required for fraud prevention, security,
            financial records, dispute resolution, or another legal obligation. Information in
            backups is removed through the normal backup lifecycle.
          </p>
        </LegalSection>

        <LegalSection title="Delete permanently">
          {session === "loading" ? (
            <div className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking your account
            </div>
          ) : session ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition active:scale-[0.98] disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete my account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sign in first so Ascendr can verify and delete the correct account.
              </p>
              <Link
                to="/profile"
                className="flex h-12 w-full items-center justify-center rounded-full bg-neon px-5 text-sm font-semibold text-neon-foreground"
              >
                Go to sign in
              </Link>
            </div>
          )}
        </LegalSection>

        <LegalSection title="Email fallback">
          <p>
            If direct deletion is unavailable, send the request from the email address associated
            with your Ascendr account. Never include a password or payment-card information.
          </p>
          <a
            href={DELETE_REQUEST_URL}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/10 px-5 text-sm font-semibold transition active:scale-[0.98]"
          >
            <Mail className="size-4" /> Email deletion request
          </a>
        </LegalSection>
      </LegalPage>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="w-[calc(100%_-_2.5rem)] max-w-md rounded-[28px] border-white/10 bg-background">
          <AlertDialogHeader>
            <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your cloud profile, logs, Coach history, scans, and uploaded photos. It
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep my account</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeletion()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
