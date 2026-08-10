import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/_app/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Ascendr" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your privacy"
      title="Privacy Policy"
      introduction="This policy explains the information Ascendr processes, why it is needed, and the choices available to you. Fitness profiles and scan photos can be sensitive, so we design these features around user control."
    >
      <LegalSection title="1. Information you provide">
        <LegalList>
          <li>
            Account details, such as your name, email address, and authentication information.
          </li>
          <li>
            Profile and onboarding answers, including age, gender, height, weight, goals,
            experience, equipment, schedule, and optional injury notes.
          </li>
          <li>
            Workout history, logged weights, nutrition entries, calorie targets, and progress.
          </li>
          <li>
            Face or body photos you choose to upload, along with generated scan results and action
            plans.
          </li>
          <li>AI Coach conversations, support messages, referral codes, and product feedback.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="2. Information collected automatically">
        <p>
          We may receive basic device, browser, app-version, crash, security, and usage information
          needed to operate and protect Ascendr. Payment processors and app stores provide purchase
          status and transaction identifiers; Ascendr does not need to store your full payment-card
          number.
        </p>
      </LegalSection>

      <LegalSection title="3. How information is used">
        <LegalList>
          <li>Personalize workouts, nutrition targets, coaching, and progress insights.</li>
          <li>Process photos and prompts for the AI feature you requested.</li>
          <li>Sync your account across devices and restore your saved information.</li>
          <li>Provide support, maintain security, prevent abuse, and troubleshoot failures.</li>
          <li>Understand feature performance and improve Ascendr.</li>
          <li>Comply with legal obligations and enforce our Terms.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. AI processing and service providers">
        <p>
          When you use an AI feature, the necessary prompt, profile context, and uploaded image may
          be transmitted to contracted cloud and AI providers so they can generate the requested
          result. We also use providers for hosting, authentication, databases, analytics, customer
          support, and payment processing. They may process information only to provide their
          contracted services and under their applicable privacy and security terms.
        </p>
      </LegalSection>

      <LegalSection title="5. When information may be shared">
        <p>
          We do not sell your private scan photos or personal fitness profile. Information may be
          shared with service providers, when you direct us to share it, during a business
          reorganization subject to appropriate protections, or when reasonably necessary to comply
          with law, protect safety, and prevent fraud or abuse.
        </p>
      </LegalSection>

      <LegalSection title="6. Storage and retention">
        <p>
          Account information and saved activity are generally retained while your account remains
          active. Some information may remain temporarily in backups, security logs, or records
          required for legal and financial compliance. Guest information may remain only on the
          device until it is synced, cleared, or the app’s local data is removed.
        </p>
      </LegalSection>

      <LegalSection title="7. Your choices and rights">
        <LegalList>
          <li>Update profile and fitness information from within Ascendr.</li>
          <li>Choose whether to upload a face or body photo.</li>
          <li>Request access, correction, export, or deletion of eligible personal information.</li>
          <li>Cancel a subscription through the store or provider used to purchase it.</li>
          <li>Contact us to raise a privacy concern or exercise applicable regional rights.</li>
        </LegalList>
        <p>
          We may need to verify your identity before completing a privacy request. Some information
          may be retained when required by law or needed to protect the service and other users.
        </p>
        <Link
          to="/delete-account"
          className="inline-flex rounded-full border border-neon/25 bg-neon/[0.07] px-4 py-2 font-semibold text-neon"
        >
          Request account deletion
        </Link>
      </LegalSection>

      <LegalSection title="8. Security and international processing">
        <p>
          We use administrative, technical, and organizational safeguards appropriate to the nature
          of the information. No internet service is completely secure. Ascendr and its providers
          may process information in countries other than your own, subject to applicable transfer
          protections.
        </p>
      </LegalSection>

      <LegalSection title="9. Policy updates">
        <p>
          We may update this policy as features and legal requirements change. The date above shows
          the latest revision. We will provide additional notice when required for material changes.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
