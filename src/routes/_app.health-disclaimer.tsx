import { createFileRoute } from "@tanstack/react-router";

import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/_app/health-disclaimer")({
  head: () => ({ meta: [{ title: "Health & AI Disclaimer — Ascendr" }] }),
  component: HealthDisclaimerPage,
});

function HealthDisclaimerPage() {
  return (
    <LegalPage
      eyebrow="Important information"
      title="Health & AI Disclaimer"
      introduction="Ascendr is a fitness and wellness tool—not a doctor, dietitian, physical therapist, emergency service, or laboratory measurement. Use its guidance as general information and personal motivation."
    >
      <LegalSection title="Not medical advice">
        <p>
          Content from Ascendr, including AI Coach responses, workouts, calorie targets, macro
          suggestions, recovery guidance, and scan feedback, is educational and informational. It is
          not a diagnosis, treatment plan, prescription, or substitute for individualized advice
          from a qualified professional.
        </p>
      </LegalSection>

      <LegalSection title="Face and body scans">
        <LegalList>
          <li>Scores are subjective AI-generated opinions, not factual ratings.</li>
          <li>Body-fat output is an approximate visual range, not a clinical measurement.</li>
          <li>
            Lighting, pose, clothing, camera angle, image quality, and model variability can affect
            results.
          </li>
          <li>
            Results should not be used to diagnose a condition, determine health status, or make a
            medical decision.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Exercise safety">
        <p>
          Consider your health, ability, equipment, environment, and experience before following a
          workout. Use appropriate technique and supervision. Stop exercising and seek appropriate
          help if you experience chest pain, fainting, severe shortness of breath, sudden weakness,
          severe pain, or another urgent symptom.
        </p>
      </LegalSection>

      <LegalSection title="Nutrition and body image">
        <p>
          Calorie and macro targets are estimates. Needs vary with medical history, medication,
          pregnancy, age, activity, and other factors. Do not use Ascendr to support starvation,
          purging, dangerous dehydration, or extreme weight changes. If tracking or appearance
          feedback is causing distress or disordered behavior, stop using those features and seek
          support from a qualified professional.
        </p>
      </LegalSection>

      <LegalSection title="No guaranteed outcome">
        <p>
          Fitness outcomes depend on many factors, including consistency, recovery, genetics,
          health, technique, and nutrition. Ascendr does not guarantee weight loss, muscle gain,
          appearance changes, performance improvements, or any specific result.
        </p>
      </LegalSection>

      <LegalSection title="Emergencies">
        <p>
          Ascendr does not monitor messages for emergencies. If you believe you are experiencing a
          medical emergency, contact local emergency services immediately. For non-urgent health
          concerns, speak with a doctor or another appropriately qualified professional.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
