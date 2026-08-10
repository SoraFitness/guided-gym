import { createFileRoute } from "@tanstack/react-router";
import { Mail, Trash2 } from "lucide-react";

import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";

const DELETE_REQUEST_URL =
  "mailto:help@ascendr.org?subject=Ascendr%20Account%20Deletion%20Request&body=Hello%20Ascendr%20Support%2C%0A%0AI%20would%20like%20to%20delete%20my%20Ascendr%20account.%0A%0AAccount%20email%3A%20%0A%0AThank%20you.";

export const Route = createFileRoute("/_app/delete-account")({
  head: () => ({ meta: [{ title: "Delete Account — Ascendr" }] }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <LegalPage
      eyebrow="Account controls"
      title="Delete your account"
      introduction="You can request permanent deletion of your Ascendr account and its associated personal information. Signing out or resetting the local profile does not delete your cloud account."
    >
      <LegalSection title="What your request covers">
        <LegalList>
          <li>Your Ascendr account and cloud profile.</li>
          <li>Saved workout, nutrition, Coach, progress, and scan records tied to the account.</li>
          <li>Uploaded face, body, and progress photos retained with the account.</li>
        </LegalList>
        <p>
          Limited information may be retained when required for fraud prevention, security,
          financial records, dispute resolution, or another legal obligation. Information remaining
          temporarily in backups will be removed through the normal backup lifecycle.
        </p>
      </LegalSection>

      <LegalSection title="How to request deletion">
        <p>
          Tap below and send the request from the email address associated with your Ascendr
          account. We may ask you to verify ownership before deletion. Do not include passwords,
          payment-card numbers, or other unnecessary sensitive information.
        </p>
        <a
          href={DELETE_REQUEST_URL}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition active:scale-[0.98]"
        >
          <Trash2 className="size-4" />
          Request account deletion
        </a>
      </LegalSection>

      <div className="mx-1 flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
        <Mail className="mt-0.5 size-4 shrink-0 text-neon" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          If the button does not open your email app, write to
          <span className="font-semibold text-white/80"> help@ascendr.org</span> with the subject
          “Ascendr Account Deletion Request.”
        </p>
      </div>
    </LegalPage>
  );
}
