import { createFileRoute } from "@tanstack/react-router";

import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/_app/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — Ascendr" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      introduction="These Terms govern your access to Ascendr, including its workout, nutrition, AI Coach, face-scan, and body-scan experiences. By creating an account or using Ascendr, you agree to them."
    >
      <LegalSection title="1. Who may use Ascendr">
        <p>
          You must be at least 18 years old, or the age of legal majority where you live, and able
          to enter a binding agreement. You are responsible for the accuracy of your information and
          for protecting access to your account.
        </p>
      </LegalSection>

      <LegalSection title="2. Fitness and AI features">
        <p>
          Ascendr provides general fitness, nutrition, appearance, and wellness information. AI
          Coach responses, workout suggestions, calorie targets, body-fat ranges, scan scores, and
          appearance feedback are generated estimates and opinions. They are not medical advice,
          diagnoses, professional coaching, or precise body-composition measurements.
        </p>
        <p>
          You are responsible for deciding whether an exercise or recommendation is appropriate for
          you. Stop if you feel pain, dizziness, chest discomfort, or other concerning symptoms and
          seek qualified care when needed.
        </p>
      </LegalSection>

      <LegalSection title="3. Your content">
        <p>
          You retain ownership of the photos, messages, workout logs, nutrition entries, and other
          content you submit. You grant Ascendr a limited license to host, process, transmit, and
          display that content only as needed to operate, secure, and improve the services you
          request.
        </p>
        <LegalList>
          <li>Only upload content you own or have permission to use.</li>
          <li>Do not upload illegal, abusive, exploitative, or deceptive material.</li>
          <li>Do not attempt to reverse engineer, disrupt, scrape, or misuse the service.</li>
          <li>Do not use Ascendr to assess another person without their informed permission.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Subscriptions and purchases">
        <p>
          Paid plans may renew automatically unless canceled before the renewal date. Prices,
          billing periods, trials, and included features are shown before purchase. Purchases made
          through an app store or payment provider are also subject to that provider’s billing,
          cancellation, and refund rules. Refunds are provided where required by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="5. Availability and changes">
        <p>
          We may add, remove, test, or update features to keep Ascendr useful and secure. AI output
          can occasionally be delayed, incomplete, or incorrect. We do not guarantee uninterrupted
          access, specific fitness results, or that every feature will always remain available.
        </p>
      </LegalSection>

      <LegalSection title="6. Suspension and termination">
        <p>
          You may stop using Ascendr at any time. We may restrict or terminate access when
          reasonably necessary to address fraud, abuse, safety risks, legal requirements, or
          material violations of these Terms. Contact support to request account deletion.
        </p>
      </LegalSection>

      <LegalSection title="7. Disclaimers and liability">
        <p>
          To the fullest extent permitted by law, Ascendr is provided “as is” and “as available.”
          Ascendr and its service providers are not liable for indirect, incidental, special,
          consequential, or punitive damages, or for losses caused by relying on AI-generated
          estimates. Nothing in these Terms limits rights or remedies that cannot legally be
          limited.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to these Terms">
        <p>
          We may update these Terms as Ascendr evolves. We will update the date above and provide
          additional notice when a material change requires it. Continued use after an update means
          you accept the revised Terms to the extent permitted by law.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
