import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Dumbbell,
  Sparkles,
  Heart,
  Activity,
  Home,
  Building2,
  TrendingDown,
  Mountain,
  Layers,
  Zap,
  Footprints,
  Apple,
  Bike,
  Instagram,
  Youtube,
  Users,
  Search,
  Smartphone,
  MoreHorizontal,
  Music2,
  Languages,
  ChevronDown,
  X,
  Mars,
  Venus,
  UserRound,
  LockKeyhole,
  Loader2,
  ScanLine,
} from "lucide-react";
import { SoftAccountPrompt } from "@/components/SoftAccountPrompt";
import { PhotoSlot } from "@/components/bodyscan/BodyPhotoUploader";
import { LockedBodyScanPreview } from "@/components/scans/LockedBodyScanPreview";
import { ScanAnalysisProgress } from "@/components/scans/ScanAnalysisProgress";
import {
  useProfile,
  GOAL_LABELS,
  getProfileGoals,
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  NUTRITION_LABELS,
  FOCUS_LABELS,
  type Profile,
  type Goal,
  type Gender,
  type ExperienceLevel,
  type EquipmentSetup,
  type FocusArea,
  type NutritionPlan,
} from "@/lib/profile";
import {
  ACTIVITY_LABELS,
  ACTIVITY_DESCRIPTIONS,
  type ActivityLevel,
  type DeficitSplit,
  type BulkPace,
} from "@/lib/calorieEngine";
import { suggestNutrition } from "@/lib/nutritionService";
import { saveGoals } from "@/lib/foods";
import { workoutRecommendationService } from "@/lib/workouts";
import { weeklyScheduleService } from "@/lib/weeklySchedule";
import { getWorkoutSplitOption, type WorkoutSplitId } from "@/lib/workoutSplits";
import { generateWorkoutPlan } from "@/lib/workoutPlan.functions";
import { analyzeBodyScanPreview, type BodyScanPreviewResult } from "@/lib/bodyScan.functions";
import { compressImage } from "@/lib/imageCompress";
import {
  saveWorkoutPlan,
  type SavedWorkoutPlan,
  type WorkoutPlanInput,
} from "@/lib/workoutPlanStore";
import { cn } from "@/lib/utils";
import { savePendingBodyScan } from "@/lib/pendingBodyScan";
import {
  getOnboardingPaywallCheckpoint,
  ONBOARDING_PROGRESS_STORAGE_KEY,
  saveOnboardingPaywallCheckpoint,
} from "@/lib/onboardingResume";
import { getSubscription } from "@/lib/subscription";
import { createClientId } from "@/lib/clientId";
import {
  buildOnboardingResponseSnapshot,
  captureBrowserAttribution,
  getOnboardingVisitorId,
  ONBOARDING_FLOW_VERSION,
} from "@/lib/onboardingAnalytics";
import {
  captureOnboardingCompleted,
  captureOnboardingStarted,
} from "@/lib/onboardingInsights.functions";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get Started — Ascendr" },
      { name: "description", content: "Tell us about you and get a personalized training plan." },
    ],
  }),
  component: Onboarding,
});

type ReferralSource = NonNullable<Profile["referralSource"]>;
type OnboardingMotivation = NonNullable<Profile["onboardingMotivation"]>;

type OnboardingLanguage = "en-US" | "es" | "fr" | "de" | "pt-BR" | "it" | "ja" | "ko";

interface WelcomeCopy {
  eyebrow: string;
  title: string;
  promises: [string, string, string];
  description: string;
  getStarted: string;
  accountPrompt: string;
  signIn: string;
}

const ONBOARDING_LANGUAGES: Array<{
  id: OnboardingLanguage;
  name: string;
  shortName: string;
}> = [
  { id: "en-US", name: "English (US)", shortName: "EN" },
  { id: "es", name: "Español", shortName: "ES" },
  { id: "fr", name: "Français", shortName: "FR" },
  { id: "de", name: "Deutsch", shortName: "DE" },
  { id: "pt-BR", name: "Português (BR)", shortName: "PT" },
  { id: "it", name: "Italiano", shortName: "IT" },
  { id: "ja", name: "日本語", shortName: "JA" },
  { id: "ko", name: "한국어", shortName: "KO" },
];

function LanguageFlag({
  language,
  className,
}: {
  language: OnboardingLanguage;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 28 20"
      aria-hidden="true"
      className={cn(
        "shrink-0 overflow-hidden rounded-[3px] border border-white/15 shadow-sm",
        className,
      )}
    >
      {language === "en-US" && (
        <>
          <rect width="28" height="20" fill="#fff" />
          {[0, 4, 8, 12, 16].map((y) => (
            <rect key={y} y={y} width="28" height="2" fill="#d7263d" />
          ))}
          <rect width="12" height="10" fill="#24478f" />
          {[2, 6, 10].flatMap((x) =>
            [2, 5, 8].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.65" fill="#fff" />),
          )}
        </>
      )}
      {language === "es" && (
        <>
          <rect width="28" height="20" fill="#c8102e" />
          <rect y="5" width="28" height="10" fill="#ffc400" />
          <rect x="7" y="8" width="2" height="4" rx="0.5" fill="#b51f2e" />
        </>
      )}
      {language === "fr" && (
        <>
          <rect width="9.34" height="20" fill="#1b4f9c" />
          <rect x="9.33" width="9.34" height="20" fill="#fff" />
          <rect x="18.66" width="9.34" height="20" fill="#ef3340" />
        </>
      )}
      {language === "de" && (
        <>
          <rect width="28" height="6.67" fill="#171717" />
          <rect y="6.66" width="28" height="6.68" fill="#dd2033" />
          <rect y="13.33" width="28" height="6.67" fill="#ffce00" />
        </>
      )}
      {language === "pt-BR" && (
        <>
          <rect width="28" height="20" fill="#159447" />
          <path d="M14 2.5 25 10 14 17.5 3 10Z" fill="#ffdf38" />
          <circle cx="14" cy="10" r="4.25" fill="#284b9b" />
          <path d="M10.2 9.1c2.7-.8 5.4-.4 7.7 1" fill="none" stroke="#fff" strokeWidth="0.8" />
        </>
      )}
      {language === "it" && (
        <>
          <rect width="9.34" height="20" fill="#169b62" />
          <rect x="9.33" width="9.34" height="20" fill="#fff" />
          <rect x="18.66" width="9.34" height="20" fill="#ce2b37" />
        </>
      )}
      {language === "ja" && (
        <>
          <rect width="28" height="20" fill="#fff" />
          <circle cx="14" cy="10" r="5" fill="#bc002d" />
        </>
      )}
      {language === "ko" && (
        <>
          <rect width="28" height="20" fill="#fff" />
          <path d="M10 10a4 4 0 0 1 8 0c-1.3-1.4-2.7-1.4-4 0s-2.7 1.4-4 0Z" fill="#cd2e3a" />
          <path d="M18 10a4 4 0 0 1-8 0c1.3 1.4 2.7 1.4 4 0s2.7-1.4 4 0Z" fill="#0f64b3" />
          <path
            d="m5 5 4 2M4.5 6.5l4 2M19 12l4 2M19.5 13.5l4 2"
            stroke="#151515"
            strokeWidth="0.8"
          />
        </>
      )}
    </svg>
  );
}

const WELCOME_COPY: Record<OnboardingLanguage, WelcomeCopy> = {
  "en-US": {
    eyebrow: "YOUR FITNESS, FINALLY CONNECTED",
    title: "One clear path to a stronger you.",
    promises: ["Train with direction.", "Eat with confidence.", "See progress clearly."],
    description:
      "Personalized workouts, simple nutrition tracking, and AI insights—built around your life.",
    getStarted: "Get Started",
    accountPrompt: "Already have an account?",
    signIn: "Sign in",
  },
  es: {
    eyebrow: "TU FITNESS, POR FIN CONECTADO",
    title: "Un camino claro hacia una versión más fuerte de ti.",
    promises: ["Entrena con propósito.", "Come con confianza.", "Mira tu progreso con claridad."],
    description:
      "Entrenamientos personalizados, nutrición sencilla e información con IA adaptada a tu vida.",
    getStarted: "Comenzar",
    accountPrompt: "¿Ya tienes una cuenta?",
    signIn: "Iniciar sesión",
  },
  fr: {
    eyebrow: "VOTRE FITNESS, ENFIN CONNECTÉ",
    title: "Un chemin clair vers une version plus forte de vous.",
    promises: [
      "Entraînez-vous avec un cap.",
      "Mangez en confiance.",
      "Voyez clairement vos progrès.",
    ],
    description:
      "Entraînements personnalisés, nutrition simplifiée et conseils IA adaptés à votre quotidien.",
    getStarted: "Commencer",
    accountPrompt: "Vous avez déjà un compte ?",
    signIn: "Se connecter",
  },
  de: {
    eyebrow: "DEINE FITNESSZIELE, ENDLICH VEREINT",
    title: "Ein klarer Weg zu deinem stärkeren Ich.",
    promises: ["Trainiere mit Plan.", "Iss mit Vertrauen.", "Sieh deinen Fortschritt klar."],
    description:
      "Personalisierte Workouts, einfaches Ernährungstracking und KI-Einblicke für deinen Alltag.",
    getStarted: "Loslegen",
    accountPrompt: "Du hast bereits ein Konto?",
    signIn: "Anmelden",
  },
  "pt-BR": {
    eyebrow: "SEU FITNESS, FINALMENTE CONECTADO",
    title: "Um caminho claro para uma versão mais forte de você.",
    promises: ["Treine com direção.", "Coma com confiança.", "Veja seu progresso com clareza."],
    description:
      "Treinos personalizados, nutrição simples e insights de IA feitos para a sua rotina.",
    getStarted: "Começar",
    accountPrompt: "Já tem uma conta?",
    signIn: "Entrar",
  },
  it: {
    eyebrow: "IL TUO FITNESS, FINALMENTE CONNESSO",
    title: "Un percorso chiaro verso una versione più forte di te.",
    promises: ["Allenati con uno scopo.", "Mangia con sicurezza.", "Guarda i tuoi progressi."],
    description:
      "Allenamenti personalizzati, nutrizione semplice e insight IA costruiti sulla tua vita.",
    getStarted: "Inizia",
    accountPrompt: "Hai già un account?",
    signIn: "Accedi",
  },
  ja: {
    eyebrow: "フィットネスを、ひとつに",
    title: "より強い自分へ、迷わない道を。",
    promises: ["目的を持って鍛える。", "自信を持って食べる。", "進歩をはっきり実感する。"],
    description: "あなたの生活に合わせたワークアウト、栄養管理、AIインサイト。",
    getStarted: "始める",
    accountPrompt: "すでにアカウントをお持ちですか？",
    signIn: "ログイン",
  },
  ko: {
    eyebrow: "피트니스를 하나로",
    title: "더 강한 나를 향한 분명한 길.",
    promises: ["목표 있게 운동하세요.", "자신 있게 식사하세요.", "변화를 선명하게 확인하세요."],
    description: "내 일상에 맞춘 운동, 간편한 영양 관리, AI 인사이트를 한곳에서 만나보세요.",
    getStarted: "시작하기",
    accountPrompt: "이미 계정이 있으신가요?",
    signIn: "로그인",
  },
};

interface Draft {
  name: string;
  goal: Goal;
  goals: Goal[];
  experience: ExperienceLevel;
  currentWorkoutsPerWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  equipment: EquipmentSetup;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMinutes: 20 | 30 | 45 | 60;
  focusAreas: FocusArea[];
  workoutSplit: WorkoutSplitId;
  currentWeightKg: number;
  goalWeightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  bodyFatPct?: number;
  activityLevel: ActivityLevel;
  avgStepsPerDay?: number;
  goalTargetDate: string;
  deficitSplit: DeficitSplit;
  bulkPace: BulkPace;
  nutritionPlan: NutritionPlan;
  units: "metric" | "imperial";
  referralSource?: ReferralSource;
  motivation?: OnboardingMotivation;
  equipmentItems: string[];
  trainingLimitations: TrainingLimitation[];
  limitationNotes: string;
}

type TrainingLimitation = "knees" | "shoulders" | "lower_back" | "other";

const TRAINING_LIMITATION_LABELS: Record<TrainingLimitation, string> = {
  knees: "Knees",
  shoulders: "Shoulders",
  lower_back: "Lower back",
  other: "Other",
};

const defaultTargetDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 84);
  return d.toISOString();
};

const DEFAULT_DRAFT: Draft = {
  name: "",
  goal: "build_muscle",
  goals: [],
  experience: "intermediate",
  currentWorkoutsPerWeek: 3,
  equipment: "dumbbells",
  daysPerWeek: 4,
  sessionMinutes: 45,
  focusAreas: ["chest", "back", "legs"],
  workoutSplit: "auto",
  currentWeightKg: 75,
  goalWeightKg: 72,
  heightCm: 175,
  age: 26,
  gender: "other",
  bodyFatPct: undefined,
  activityLevel: "moderate",
  avgStepsPerDay: undefined,
  goalTargetDate: defaultTargetDate(),
  deficitSplit: "balanced",
  bulkPace: "lean",
  nutritionPlan: "muscle_gain",
  units: "metric",
  referralSource: undefined,
  motivation: undefined,
  equipmentItems: ["Dumbbells"],
  trainingLimitations: [],
  limitationNotes: "",
};

function equipmentItemsForSetup(setup: EquipmentSetup): string[] {
  switch (setup) {
    case "gym":
      return ["Full gym access"];
    case "dumbbells":
      return ["Dumbbells"];
    case "mixed":
      return ["Dumbbells", "Bench", "Resistance bands"];
    default:
      return ["No equipment"];
  }
}

function buildSmartOnboardingPlan(profile: Profile, input: WorkoutPlanInput): SavedWorkoutPlan {
  const split = getWorkoutSplitOption(profile.workoutSplit);
  const workouts = workoutRecommendationService.recommend(profile, profile.daysPerWeek);
  const focus = profile.focusAreas.map((area) => FOCUS_LABELS[area]).join(" + ");
  const goals = getProfileGoals(profile);
  const goalLabels = goals.map((goal) => GOAL_LABELS[goal]);
  return {
    id: createClientId(),
    name: `${split.shortName} · ${goalLabels[0]}${goalLabels.length > 1 ? ` +${goalLabels.length - 1}` : ""}`.slice(
      0,
      50,
    ),
    summary: `A ${profile.daysPerWeek}-day ${split.shortName.toLowerCase()} plan balancing ${goalLabels.join(" and ").toLowerCase()}, focused on ${focus.toLowerCase()}, and matched to your available equipment.`,
    createdAt: new Date().toISOString(),
    source: "smart",
    input,
    workoutIds: workouts.map((workout) => workout.id),
  };
}

function profileFromDraft(draft: Draft, personalizedName: string): Profile {
  const { trainingLimitations, limitationNotes, motivation, ...profileDraft } = draft;
  const safeTrainingLimitations = trainingLimitations ?? [];
  const namedLimitations = safeTrainingLimitations
    .filter((limitation) => limitation !== "other")
    .map((limitation) => TRAINING_LIMITATION_LABELS[limitation]);
  const limitationsSummary = [
    namedLimitations.length
      ? `Avoid or modify movements that aggravate: ${namedLimitations.join(", ")}.`
      : "",
    safeTrainingLimitations.includes("other") && limitationNotes?.trim()
      ? `Additional exercise limitations: ${limitationNotes.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ...profileDraft,
    name: personalizedName || "Athlete",
    goal: draft.goals[0] ?? draft.goal,
    goals: draft.goals.length ? draft.goals : [draft.goal],
    injuries: limitationsSummary,
    onboardingMotivation: motivation,
    completedAt: new Date().toISOString(),
  };
}

function planInputFromProfile(profile: Profile): WorkoutPlanInput {
  return {
    goal: profile.goal,
    goals: getProfileGoals(profile),
    experience: profile.experience,
    currentWorkoutsPerWeek: profile.currentWorkoutsPerWeek,
    equipment: profile.equipment,
    focusAreas: profile.focusAreas,
    daysPerWeek: profile.daysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    workoutSplit: profile.workoutSplit ?? "auto",
    notes: profile.injuries ?? "",
  };
}

const ONBOARDING_NAME_STORAGE_KEY = "ascendr_onboarding_name";
const TOTAL = 6;

interface StoredOnboardingProgress {
  draft: Partial<Draft>;
  step: number;
  genderSelected: boolean;
  flowVersion?: string;
}

function readStoredOnboardingProgress(): StoredOnboardingProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredOnboardingProgress>;
    if (parsed.flowVersion !== ONBOARDING_FLOW_VERSION) return null;
    return {
      draft: parsed.draft && typeof parsed.draft === "object" ? parsed.draft : {},
      step:
        typeof parsed.step === "number" && Number.isFinite(parsed.step)
          ? Math.max(0, Math.min(TOTAL - 1, Math.round(parsed.step)))
          : 0,
      genderSelected: parsed.genderSelected === true,
    };
  } catch {
    return null;
  }
}

function formatFirstName(value: string) {
  const trimmed = value.trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : "";
}

function nutritionPlanForGoal(goal: Goal): NutritionPlan {
  if (goal === "lose_weight") return "fat_loss";
  if (goal === "build_muscle") return "muscle_gain";
  if (goal === "maintain") return "maintenance";
  return "custom";
}

const GOAL_FOCUS_AREAS: Record<Goal, FocusArea[]> = {
  lose_weight: ["cardio", "legs", "core", "mobility"],
  build_muscle: ["chest", "back", "legs", "arms"],
  recomp: ["chest", "back", "legs", "core"],
  endurance: ["cardio", "legs", "core", "mobility"],
  maintain: ["chest", "back", "legs", "cardio", "mobility"],
  get_stronger: ["chest", "back", "legs", "core"],
  overall: ["chest", "back", "legs", "cardio", "mobility"],
};

function focusAreasForGoals(goals: Goal[]): FocusArea[] {
  return [...new Set(goals.flatMap((goal) => GOAL_FOCUS_AREAS[goal]))].slice(0, 5);
}

function Onboarding() {
  const navigate = useNavigate();
  const { setProfile } = useProfile();
  const generatePlan = useServerFn(generateWorkoutPlan);
  const recordOnboardingStart = useServerFn(captureOnboardingStarted);
  const recordOnboardingCompletion = useServerFn(captureOnboardingCompleted);
  const [restoredProgress] = useState(() => readStoredOnboardingProgress());
  const [step, setStep] = useState(restoredProgress?.step ?? 0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [generating, setGenerating] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<SavedWorkoutPlan | null>(null);
  const [d, setD] = useState<Draft>(() => {
    if (typeof window === "undefined") return DEFAULT_DRAFT;
    try {
      return {
        ...DEFAULT_DRAFT,
        ...restoredProgress?.draft,
        // Never restore a manual split from an older onboarding session.
        // The completed profile is handed to the plan generator in auto mode.
        workoutSplit: "auto",
        name:
          restoredProgress?.draft.name?.slice(0, 32) ??
          localStorage.getItem(ONBOARDING_NAME_STORAGE_KEY)?.slice(0, 32) ??
          "",
      };
    } catch {
      return DEFAULT_DRAFT;
    }
  });
  const [genderSelected, setGenderSelected] = useState(restoredProgress?.genderSelected ?? false);
  const [language, setLanguage] = useState<OnboardingLanguage>(() => {
    if (typeof window === "undefined") return "en-US";
    const saved = localStorage.getItem("ascendr_onboarding_language");
    return ONBOARDING_LANGUAGES.some((option) => option.id === saved)
      ? (saved as OnboardingLanguage)
      : "en-US";
  });
  const [languageOpen, setLanguageOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [analyticsSession] = useState(() => {
    if (typeof window === "undefined") return null;
    return {
      visitorId: getOnboardingVisitorId(),
      attribution: captureBrowserAttribution(),
    };
  });

  const update = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const welcomeCopy = WELCOME_COPY[language];
  const personalizedName = formatFirstName(d.name);
  const selectedLanguage =
    ONBOARDING_LANGUAGES.find((option) => option.id === language) ?? ONBOARDING_LANGUAGES[0];

  useEffect(() => {
    document.documentElement.lang = language === "en-US" ? "en" : language.split("-")[0];
    localStorage.setItem("ascendr_onboarding_language", language);
  }, [language]);

  useEffect(() => {
    if (!analyticsSession) return;
    void recordOnboardingStart({
      data: {
        visitorId: analyticsSession.visitorId,
        flowVersion: ONBOARDING_FLOW_VERSION,
        attribution: analyticsSession.attribution,
      },
    }).catch(() => {
      // Analytics should never interrupt someone who is starting their plan.
    });
  }, [analyticsSession, recordOnboardingStart]);

  useEffect(() => {
    try {
      if (d.name) {
        localStorage.setItem(ONBOARDING_NAME_STORAGE_KEY, d.name);
      } else {
        localStorage.removeItem(ONBOARDING_NAME_STORAGE_KEY);
      }
    } catch {
      // Onboarding still works when local storage is unavailable.
    }
  }, [d.name]);

  useEffect(() => {
    try {
      const progress: StoredOnboardingProgress = {
        draft: d,
        step,
        genderSelected,
        flowVersion: ONBOARDING_FLOW_VERSION,
      };
      localStorage.setItem(ONBOARDING_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Keep the live flow usable if storage is restricted.
    }
  }, [d, genderSelected, step]);

  useEffect(() => {
    const checkpoint = getOnboardingPaywallCheckpoint();
    if (!checkpoint || getSubscription().active) return;
    navigate({
      to: "/paywall",
      search: { source: checkpoint.source ?? undefined },
      replace: true,
    });
  }, [navigate]);

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return d.name.trim().length >= 2 && d.goals.length > 0;
      case 3:
        return (
          genderSelected &&
          d.currentWeightKg > 0 &&
          d.heightCm > 0 &&
          d.age > 0 &&
          d.goalWeightKg > 0
        );
      default:
        return true;
    }
  }, [step, d, genderSelected]);

  const goNext = () => {
    if (!canNext) return;
    if (step === TOTAL - 1) {
      void finish();
      return;
    }
    setDir(1);
    setStep((s) => s + 1);
  };
  const goBack = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const finish = async () => {
    const profile = profileFromDraft(d, personalizedName);
    const nutritionGoals = suggestNutrition(profile);
    saveGoals(nutritionGoals);
    setProfile(profile);

    if (analyticsSession) {
      void recordOnboardingCompletion({
        data: {
          visitorId: analyticsSession.visitorId,
          flowVersion: ONBOARDING_FLOW_VERSION,
          attribution: captureBrowserAttribution(d.referralSource),
          responses: buildOnboardingResponseSnapshot({
            goal: d.goal,
            goals: d.goals,
            experience: d.experience,
            equipment: d.equipment,
            daysPerWeek: d.daysPerWeek,
            sessionMinutes: d.sessionMinutes,
            currentWorkoutsPerWeek: d.currentWorkoutsPerWeek,
            focusAreas: d.focusAreas,
            gender: d.gender,
            activityLevel: d.activityLevel,
            nutritionPlan: d.nutritionPlan,
            units: d.units,
            motivation: d.motivation ?? null,
            hasTrainingLimitations: d.trainingLimitations.length > 0,
          }),
        },
      }).catch(() => {
        // Plan creation remains available if analytics is offline or not configured.
      });
    }
    setGenerating(true);

    const input = planInputFromProfile(profile);

    let plan: SavedWorkoutPlan;
    try {
      const response = await Promise.race([
        generatePlan({ data: input }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Plan generation timed out")), 15_000),
        ),
      ]);
      plan = response.plan;
    } catch (error) {
      console.warn("[onboarding] AI plan generation failed; using smart plan", error);
      plan = buildSmartOnboardingPlan(profile, input);
    }
    saveWorkoutPlan(plan);
    setGeneratedPlan(plan);
    setPlanReady(true);
  };

  if (generating) {
    return (
      <CustomizingPlan
        ready={planReady}
        plan={generatedPlan}
        onDone={() => {
          saveOnboardingPaywallCheckpoint(personalizedName, null);
          navigate({ to: "/paywall", search: { source: undefined } });
        }}
      />
    );
  }

  const stepLabels = [
    "",
    "Your direction",
    "Your rhythm",
    "Your baseline",
    "Your reason",
    "Your plan",
  ];

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-background">
      <header
        className={cn(
          "z-50 w-full px-4",
          step === 0 ? "pointer-events-none absolute inset-x-0 top-0" : "relative",
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div
          className={cn("mx-auto flex w-full max-w-md items-center", step === 0 && "justify-end")}
        >
          {step === 0 ? (
            <div className="pointer-events-auto relative">
              <button
                type="button"
                onClick={() => setLanguageOpen((open) => !open)}
                className="flex h-8 items-center gap-1 rounded-full border border-white/[0.08] bg-[#171a18]/90 px-2 text-[10px] font-semibold shadow-lg shadow-black/20 backdrop-blur-xl transition hover:bg-white/[0.075]"
                aria-label="Change language"
                aria-expanded={languageOpen}
              >
                <LanguageFlag language={selectedLanguage.id} className="h-3 w-[1.125rem]" />
                <span>{selectedLanguage.shortName}</span>
                <ChevronDown
                  className={cn(
                    "size-3 text-muted-foreground transition",
                    languageOpen && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence>
                {languageOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close language menu"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setLanguageOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-3xl border border-white/[0.1] bg-[#151617]/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl"
                    >
                      <div className="flex items-center gap-2 px-3 pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        <Languages className="size-3.5" />
                        Choose language
                      </div>
                      <div className="max-h-72 overflow-y-auto overscroll-contain">
                        {ONBOARDING_LANGUAGES.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setLanguage(option.id);
                              setLanguageOpen(false);
                            }}
                            className={cn(
                              "flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm transition",
                              language === option.id
                                ? "bg-neon/12 text-neon"
                                : "text-foreground hover:bg-white/[0.06]",
                            )}
                          >
                            <LanguageFlag language={option.id} className="h-4 w-6" />
                            <span className="min-w-0 flex-1 font-semibold">{option.name}</span>
                            {language === option.id && <Check className="size-4" strokeWidth={3} />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex w-full items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                className="grid size-10 place-items-center rounded-full border border-white/[0.06] bg-white/[0.05]"
                aria-label="Back"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-neon"
                    initial={false}
                    animate={{ width: `${(step / (TOTAL - 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>{stepLabels[step]}</span>
                  <span className="tabular-nums">
                    {step} / {TOTAL - 1}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6",
          step === 0 ? "pb-32 pt-0 sm:pb-36" : "pb-28 pt-4 sm:pb-36 sm:pt-6",
        )}
      >
        <div className="mx-auto w-full max-w-md">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -28 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              {step === 0 && <Welcome copy={welcomeCopy} />}
              {step === 1 && (
                <GoalIdentityStep
                  name={d.name}
                  goals={d.goals}
                  onNameChange={(name) => update("name", name)}
                  onGoalsChange={(goals) => {
                    update("goals", goals);
                    if (goals[0]) {
                      update("goal", goals[0]);
                      update("nutritionPlan", nutritionPlanForGoal(goals[0]));
                      update("focusAreas", focusAreasForGoals(goals));
                    }
                  }}
                />
              )}
              {step === 2 && <TrainingProfileStep name={personalizedName} d={d} update={update} />}
              {step === 3 && (
                <BaselineProfileStep
                  d={d}
                  update={update}
                  genderSelected={genderSelected}
                  onGenderChange={(gender) => {
                    update("gender", gender);
                    setGenderSelected(true);
                  }}
                />
              )}
              {step === 4 && (
                <WhyNowStep
                  name={personalizedName}
                  motivation={d.motivation}
                  value={d.referralSource}
                  onMotivationChange={(motivation) => update("motivation", motivation)}
                  onSourceChange={(source) => update("referralSource", source)}
                />
              )}
              {step === 5 && <PlanPreviewStep name={personalizedName} d={d} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer
        className={cn(
          "fixed inset-x-0 z-40 bg-gradient-to-t from-background via-background/98 to-transparent px-4 pt-4 sm:px-6 sm:pt-6",
          step === 0 ? "-bottom-5" : "bottom-0",
        )}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-md">
          <button
            disabled={!canNext}
            onClick={goNext}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full font-semibold transition",
              step === 0
                ? "h-14 text-base sm:h-16 sm:text-lg"
                : "h-12 text-sm sm:h-14 sm:text-base",
              canNext
                ? "bg-neon text-neon-foreground glow-neon active:scale-[0.98]"
                : "bg-white/[0.05] text-muted-foreground",
            )}
          >
            {step === TOTAL - 1
              ? "Create My Plan"
              : step === 0
                ? welcomeCopy.getStarted
                : step === 4
                  ? "See My Plan"
                  : "Continue"}
            <ArrowRight className="size-5" />
          </button>
          {step === 0 && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {welcomeCopy.accountPrompt}{" "}
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="font-bold text-foreground underline decoration-white/25 underline-offset-4 transition hover:text-neon"
              >
                {welcomeCopy.signIn}
              </button>
            </p>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {step === 0 && signInOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 px-4 pb-safe pt-16 backdrop-blur-sm sm:items-center"
            onClick={() => setSignInOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="relative w-full max-w-md rounded-[2rem] border border-white/[0.1] bg-[#101112] p-3 shadow-2xl shadow-black/70"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSignInOpen(false)}
                className="absolute right-5 top-5 z-10 grid size-8 place-items-center rounded-full bg-white/[0.07] text-muted-foreground transition hover:text-foreground"
                aria-label="Close sign in"
              >
                <X className="size-4" />
              </button>
              <SoftAccountPrompt
                title="Welcome back"
                description="Sign in to restore your Ascendr profile, plans, scans, and progress."
                redirectPath="/home"
                storageKey="ascendr-onboarding-signin"
                dismissible={false}
                initialExpanded
                initialMode="signin"
                onSignedIn={() => navigate({ to: "/home" })}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------- Step components -------- */

function Welcome({ copy }: { copy: WelcomeCopy }) {
  const [promiseIndex, setPromiseIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setPromiseIndex((current) => (current + 1) % copy.promises.length),
      2400,
    );
    return () => window.clearInterval(timer);
  }, [copy.promises]);

  return (
    <div className="relative pt-[calc(env(safe-area-inset-top)+2.5rem)] text-center">
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-neon/10 blur-[110px]" />

      <div
        className="relative mx-auto aspect-[540/1169] rounded-[3rem] bg-[linear-gradient(145deg,#73737c_0%,#25262a_18%,#08090a_52%,#4c4d53_100%)] p-[3px] shadow-[0_30px_90px_-28px_rgba(0,0,0,0.95),0_0_70px_-28px_var(--neon)]"
        style={{ width: "clamp(10.25rem, min(59vw, 27dvh), 16.75rem)" }}
        aria-label="Ascendr shown on an iPhone 17 Pro"
      >
        <span className="absolute -left-[3px] top-[20%] h-10 w-[3px] rounded-l-full bg-zinc-500" />
        <span className="absolute -left-[3px] top-[34%] h-14 w-[3px] rounded-l-full bg-zinc-600" />
        <span className="absolute -right-[3px] top-[27%] h-16 w-[3px] rounded-r-full bg-zinc-600" />

        <div className="relative h-full w-full overflow-hidden rounded-[2.8rem] border border-black/80 bg-black">
          <video
            className="h-full w-full object-cover"
            src="/media/ascendr-onboarding.mp4"
            poster="/media/ascendr-onboarding-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            controls={false}
            disablePictureInPicture
            aria-label="Ascendr app preview"
          />
          <div className="hidden absolute inset-0 bg-[radial-gradient(circle_at_70%_12%,rgba(183,255,62,0.24),transparent_28%),linear-gradient(160deg,#161b18_0%,#090a0a_57%,#101313_100%)]" />
          <div className="relative hidden">
            <div className="flex items-center justify-between">
              <span className="text-[7px] font-black uppercase tracking-[0.18em] text-neon">
                Ascendr
              </span>
              <span className="grid size-4 place-items-center rounded-full bg-white/[0.09] text-[7px] font-bold">
                A
              </span>
            </div>
            <p className="mt-5 text-[8px] text-white/60">Today’s brief</p>
            <h3 className="mt-1 text-sm font-black leading-tight">Train with direction.</h3>
            <div className="mt-4 rounded-xl border border-neon/20 bg-neon/[0.1] p-2.5">
              <div className="flex items-center justify-between text-[7px] font-bold text-neon">
                <span>READY TO TRAIN</span>
                <span>82%</span>
              </div>
              <p className="mt-2 text-[9px] font-extrabold">Upper strength</p>
              <p className="mt-1 text-[7px] text-white/55">45 min · Dumbbells</p>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.1]">
                <div className="h-full w-[82%] rounded-full bg-neon" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-white/[0.08] bg-black/20 p-2">
                <p className="text-[6px] font-bold uppercase tracking-wide text-white/45">Fuel</p>
                <p className="mt-1 text-[10px] font-black">
                  87<span className="text-[6px] text-neon">/100</span>
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-black/20 p-2">
                <p className="text-[6px] font-bold uppercase tracking-wide text-white/45">Streak</p>
                <p className="mt-1 text-[10px] font-black">
                  06<span className="text-[6px] text-neon"> days</span>
                </p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/10" />
          <div className="pointer-events-none absolute left-1/2 top-2.5 h-5 w-[4.5rem] -translate-x-1/2 rounded-full bg-black shadow-[0_1px_0_rgba(255,255,255,0.08)]">
            <span className="absolute right-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#111d28] ring-1 ring-blue-500/10" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-9 max-w-md">
        <h1 className="mx-auto max-w-[24rem] text-[clamp(2rem,8.4vw,2.75rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-balance">
          {copy.title}
        </h1>
        <div className="relative mt-2 h-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={`${copy.promises[promiseIndex]}-${promiseIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24 }}
              className="absolute inset-x-0 text-sm font-extrabold text-neon sm:text-base"
            >
              {copy.promises[promiseIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[24px] font-extrabold leading-tight sm:text-[26px]">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof Flame;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition",
        active
          ? "border-neon bg-neon/10"
          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]",
      )}
    >
      {Icon && (
        <span
          className={cn(
            "size-11 rounded-xl grid place-items-center shrink-0",
            active ? "bg-neon text-neon-foreground" : "bg-white/[0.05] text-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px]">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <span
        className={cn(
          "size-6 rounded-full border-2 grid place-items-center shrink-0",
          active ? "border-neon bg-neon text-neon-foreground" : "border-white/15",
        )}
      >
        {active && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

const ONBOARDING_GOALS: { id: Goal; icon: typeof Flame; sub: string }[] = [
  { id: "build_muscle", icon: Dumbbell, sub: "Build a body that feels capable" },
  { id: "lose_weight", icon: TrendingDown, sub: "Feel lighter and more in control" },
  { id: "get_stronger", icon: Zap, sub: "Get noticeably stronger" },
  { id: "recomp", icon: Layers, sub: "Change how your body looks and feels" },
  { id: "endurance", icon: Activity, sub: "Have more energy for real life" },
  { id: "overall", icon: Heart, sub: "Build a rhythm that lasts" },
];

function GoalIdentityStep({
  name,
  goals,
  onNameChange,
  onGoalsChange,
}: {
  name: string;
  goals: Goal[];
  onNameChange: (value: string) => void;
  onGoalsChange: (goals: Goal[]) => void;
}) {
  const displayName = formatFirstName(name);
  const toggleGoal = (goal: Goal) => {
    if (goals.includes(goal)) {
      onGoalsChange(goals.filter((item) => item !== goal));
      return;
    }
    onGoalsChange([...goals, goal].slice(-2));
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-[2rem] border border-neon/20 bg-[radial-gradient(circle_at_100%_0%,rgba(183,255,62,0.2),transparent_42%),linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.018))] p-5 shadow-[0_18px_50px_-32px_rgba(183,255,62,0.55)]">
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-neon/20 blur-3xl" />
        <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-neon">
          This is your starting line
        </p>
        <h2 className="relative mt-3 text-[29px] font-black leading-[1.04] tracking-[-0.045em]">
          You deserve a plan that feels made for your life.
        </h2>
        <p className="relative mt-3 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
          Tell us what matters most. We’ll turn it into a simple, personal next step.
        </p>
      </div>

      <label className="mt-5 block rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 transition focus-within:border-neon/50 focus-within:bg-neon/[0.035]">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          First name
        </span>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-neon/10 text-neon">
            <UserRound className="size-4" />
          </span>
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value.slice(0, 32))}
            placeholder="What should we call you?"
            maxLength={32}
            autoComplete="given-name"
            enterKeyHint="next"
            className="h-9 min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-medium placeholder:text-muted-foreground/55"
            aria-label="First name"
          />
        </div>
      </label>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neon">
            Your direction
          </p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.03em]">
            {displayName ? `${displayName}, what changes first?` : "What changes first?"}
          </h3>
        </div>
        <span className="mb-1 shrink-0 text-[10px] font-semibold text-muted-foreground">
          Choose up to 2
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {ONBOARDING_GOALS.map(({ id, icon: Icon, sub }) => {
          const active = goals.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleGoal(id)}
              className={cn(
                "relative min-h-32 overflow-hidden rounded-2xl border p-3.5 text-left transition active:scale-[0.98]",
                active
                  ? "border-neon/70 bg-neon/[0.12] shadow-[0_12px_28px_-20px_rgba(183,255,62,0.9)]"
                  : "border-white/[0.07] bg-white/[0.035] hover:border-white/[0.15] hover:bg-white/[0.055]",
              )}
            >
              {active && (
                <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-neon text-neon-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-xl",
                  active ? "bg-neon text-neon-foreground" : "bg-white/[0.07] text-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <p className="mt-4 text-sm font-extrabold leading-tight">{GOAL_LABELS[id]}</p>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrainingProfileStep({
  name,
  d,
  update,
}: {
  name: string;
  d: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const experienceOptions: { id: ExperienceLevel; label: string; sub: string }[] = [
    { id: "beginner", label: "Starting fresh", sub: "Keep it simple and build confidence" },
    { id: "intermediate", label: "I’ve trained before", sub: "Progress with a clear structure" },
    { id: "advanced", label: "I’m experienced", sub: "Train with purposeful detail" },
  ];
  const equipmentOptions: { id: EquipmentSetup; label: string; icon: typeof Home }[] = [
    { id: "none", label: "Anywhere", icon: Home },
    { id: "dumbbells", label: "Dumbbells", icon: Dumbbell },
    { id: "gym", label: "Full gym", icon: Building2 },
    { id: "mixed", label: "Both", icon: Layers },
  ];

  return (
    <div>
      <StepHeader
        title={name ? `${name}, let’s make this realistic.` : "Let’s make this realistic."}
        sub="The best plan is one that still works on a busy week."
      />

      <section className="rounded-[1.6rem] border border-white/[0.07] bg-white/[0.025] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neon">
          Training background
        </p>
        <div className="mt-3 grid gap-2">
          {experienceOptions.map((option) => {
            const active = d.experience === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => update("experience", option.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                  active ? "border-neon/65 bg-neon/[0.1]" : "border-white/[0.06] bg-black/15",
                )}
              >
                <span>
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {option.sub}
                  </span>
                </span>
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border",
                    active ? "border-neon bg-neon text-neon-foreground" : "border-white/20",
                  )}
                >
                  {active && <Check className="size-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-3 rounded-[1.6rem] border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neon">
              Your weekly rhythm
            </p>
            <p className="mt-1 text-sm font-bold">How often can you truly show up?</p>
          </div>
          <span className="rounded-full bg-neon/10 px-2.5 py-1 text-[10px] font-bold text-neon">
            {d.daysPerWeek} days
          </span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {([2, 3, 4, 5, 6] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => update("daysPerWeek", days)}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-xl border transition",
                d.daysPerWeek === days
                  ? "border-neon bg-neon text-neon-foreground"
                  : "border-white/[0.06] bg-black/20 text-muted-foreground",
              )}
            >
              <span className="text-lg font-black leading-none">{days}</span>
              <span className="mt-1 text-[8px] font-bold uppercase tracking-wide">days</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold">Time per workout</p>
          <div className="flex rounded-full border border-white/[0.07] bg-black/20 p-1">
            {([20, 30, 45, 60] as const).map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => update("sessionMinutes", minutes)}
                className={cn(
                  "rounded-full px-2.5 py-1.5 text-[10px] font-bold transition",
                  d.sessionMinutes === minutes ? "bg-white text-black" : "text-muted-foreground",
                )}
              >
                {minutes}m
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-[1.6rem] border border-white/[0.07] bg-white/[0.025] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neon">
          Where you train
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {equipmentOptions.map(({ id, label, icon: Icon }) => {
            const active = d.equipment === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  update("equipment", id);
                  update("equipmentItems", equipmentItemsForSetup(id));
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left text-xs font-bold transition",
                  active
                    ? "border-neon/65 bg-neon/[0.1] text-foreground"
                    : "border-white/[0.06] bg-black/20 text-muted-foreground",
                )}
              >
                <Icon className={cn("size-4", active && "text-neon")} />
                {label}
                {active && <Check className="ml-auto size-3.5 text-neon" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BaselineProfileStep({
  d,
  update,
  genderSelected,
  onGenderChange,
}: {
  d: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  genderSelected: boolean;
  onGenderChange: (gender: Gender) => void;
}) {
  const genders: { id: Gender; label: string; icon: typeof Flame }[] = [
    { id: "male", label: "Male", icon: Mars },
    { id: "female", label: "Female", icon: Venus },
    { id: "other", label: "Skip", icon: UserRound },
  ];
  return (
    <div>
      <StepHeader
        title="A few details, then you’re in."
        sub="These only calibrate your training and nutrition starting point."
      />
      <section className="rounded-[1.6rem] border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold">Personalization</p>
          <span className="text-[10px] text-muted-foreground">Optional to share</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {genders.map(({ id, label, icon: Icon }) => {
            const active = genderSelected && d.gender === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onGenderChange(id)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-2xl border text-[11px] font-bold transition",
                  active
                    ? "border-neon bg-neon/10 text-neon"
                    : "border-white/[0.06] bg-black/20 text-muted-foreground",
                )}
              >
                <Icon className="mb-1 size-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>
      <div className="mt-4">
        <BodyStep d={d} update={update} compact />
      </div>
      <p className="mt-4 flex items-start gap-2.5 px-1 text-[10px] leading-relaxed text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-neon" />
        We use this to calculate a sensible starting target—not to judge your body.
      </p>
    </div>
  );
}

function WhyNowStep({
  name,
  motivation,
  value,
  onMotivationChange,
  onSourceChange,
}: {
  name: string;
  motivation: OnboardingMotivation | undefined;
  value: ReferralSource | undefined;
  onMotivationChange: (motivation: OnboardingMotivation) => void;
  onSourceChange: (source: ReferralSource) => void;
}) {
  const motivations: {
    id: OnboardingMotivation;
    label: string;
    sub: string;
    icon: typeof Flame;
  }[] = [
    {
      id: "feel_confident",
      label: "Feel confident in my body",
      sub: "See and feel the change",
      icon: Heart,
    },
    {
      id: "have_energy",
      label: "Have more energy",
      sub: "Show up stronger outside the gym",
      icon: Zap,
    },
    {
      id: "stay_consistent",
      label: "Finally stay consistent",
      sub: "Stop starting over",
      icon: Check,
    },
    {
      id: "get_stronger",
      label: "Prove I can get stronger",
      sub: "Train with something to chase",
      icon: Dumbbell,
    },
  ];
  return (
    <div>
      <div className="rounded-[2rem] border border-neon/20 bg-[linear-gradient(145deg,rgba(183,255,62,0.14),rgba(255,255,255,0.035)_54%,rgba(255,255,255,0.01))] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neon">
          One honest answer
        </p>
        <h2 className="mt-3 text-[28px] font-black leading-[1.05] tracking-[-0.045em]">
          {name || "When you picture progress"}, what would feel different?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This stays at the heart of your Ascendr experience—especially on the days motivation is
          low.
        </p>
      </div>
      <div className="mt-4 grid gap-2">
        {motivations.map(({ id, label, sub, icon: Icon }) => {
          const active = motivation === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onMotivationChange(id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                active ? "border-neon/70 bg-neon/[0.1]" : "border-white/[0.07] bg-white/[0.025]",
              )}
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-xl",
                  active ? "bg-neon text-neon-foreground" : "bg-white/[0.06]",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{label}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{sub}</span>
              </span>
              {active && <Check className="size-4 text-neon" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      <div className="mt-5 border-t border-white/[0.07] pt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold">How did you find Ascendr?</p>
          <span className="text-[10px] text-muted-foreground">Optional</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {REFERRAL_SOURCES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSourceChange(id)}
              className={cn(
                "rounded-full border px-3 py-2 text-[10px] font-bold transition",
                value === id
                  ? "border-neon/70 bg-neon/10 text-neon"
                  : "border-white/[0.07] bg-white/[0.025] text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanPreviewStep({ name, d }: { name: string; d: Draft }) {
  const profile = profileFromDraft(d, name || "Athlete");
  const nutrition = suggestNutrition(profile);
  const workouts = weeklyScheduleService
    .generateSchedule(profile)
    .filter((day) => !day.isRestDay)
    .slice(0, 3);
  const goal = GOAL_LABELS[d.goals[0] ?? d.goal];
  return (
    <div>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.018)_58%,rgba(183,255,62,0.075))] px-5 py-5 shadow-[0_22px_50px_-38px_rgba(0,0,0,0.95)]">
        <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-neon/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-neon">
              <span className="grid size-4 place-items-center rounded-full bg-neon text-neon-foreground">
                <Check className="size-2.5" strokeWidth={4} />
              </span>
              Plan ready
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              Made for {formatFirstName(name) || "you"}
            </span>
          </div>
          <h2 className="mt-5 max-w-[10ch] text-[31px] font-black leading-[1.02] tracking-[-0.055em]">
            Your first week is ready.
          </h2>
          <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
            A focused {goal.toLowerCase()} plan with the right amount of structure to get moving.
          </p>
        </div>
      </section>

      <section className="relative mt-4 overflow-hidden rounded-[1.75rem] border border-neon/25 bg-[linear-gradient(145deg,rgba(183,255,62,0.14),rgba(18,22,18,0.94)_48%,rgba(8,10,9,0.98))] p-5 shadow-[0_22px_50px_-32px_rgba(183,255,62,0.45)]">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-neon/70 to-transparent" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neon">
              Ascendr plan
            </p>
            <h3 className="mt-1 text-[22px] font-black tracking-[-0.035em]">{goal}</h3>
          </div>
          <span className="rounded-full border border-neon/25 bg-neon/[0.08] px-3 py-1.5 text-[10px] font-bold text-neon">
            Adaptive
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.075] bg-black/20 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Train
            </p>
            <p className="mt-2 text-xl font-black leading-none">{d.daysPerWeek}×</p>
            <p className="mt-1.5 text-[10px] text-white/60">each week</p>
          </div>
          <div className="rounded-2xl border border-white/[0.075] bg-black/20 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Session
            </p>
            <p className="mt-2 text-xl font-black leading-none">{d.sessionMinutes}</p>
            <p className="mt-1.5 text-[10px] text-white/60">minutes</p>
          </div>
          <div className="rounded-2xl border border-white/[0.075] bg-black/20 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Fuel
            </p>
            <p className="mt-2 text-xl font-black leading-none">{nutrition.protein}g</p>
            <p className="mt-1.5 text-[10px] text-white/60">protein</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-white/65">
          <span className="size-1.5 rounded-full bg-neon shadow-[0_0_10px_var(--neon)]" />
          Your schedule will flex when real life does.
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-white/[0.025]">
        <div className="flex items-end justify-between border-b border-white/[0.07] px-4 pb-3 pt-4">
          <div>
            <p className="text-xs font-black">Your opening week</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Three sessions, one clear starting line.
            </p>
          </div>
          <Dumbbell className="mb-0.5 size-4 text-neon" />
        </div>
        <div className="divide-y divide-white/[0.065] px-4">
          {workouts.map((workout, index) => (
            <div key={workout.id} className="flex items-center gap-3 py-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-neon/15 bg-neon/[0.08] text-[10px] font-black text-neon">
                0{index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{workout.workoutTitle}</span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {workout.focus}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-semibold text-white/60">
                {workout.duration} min
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="mx-auto mt-5 max-w-[32ch] text-center text-xs leading-relaxed text-muted-foreground">
        Start with session one. We’ll keep the plan useful as your routine takes shape.
      </p>
    </div>
  );
}

function GenderStep({
  value,
  onChange,
}: {
  value: Gender | null;
  onChange: (gender: Gender) => void;
}) {
  const options: { id: Gender; label: string; sub: string; icon: typeof Flame }[] = [
    {
      id: "male",
      label: "Male",
      sub: "Personalize your training and daily nutrition targets",
      icon: Mars,
    },
    {
      id: "female",
      label: "Female",
      sub: "Personalize your training and daily nutrition targets",
      icon: Venus,
    },
    {
      id: "other",
      label: "Prefer not to say",
      sub: "Continue with balanced, gender-neutral recommendations",
      icon: UserRound,
    },
  ];

  return (
    <div>
      <StepHeader
        title="Choose your gender"
        sub="This helps Ascendr personalize your plan. You can change it later in Profile."
      />

      <div className="space-y-3">
        {options.map(({ id, label, sub, icon }) => (
          <ChoiceCard
            key={id}
            active={value === id}
            onClick={() => onChange(id)}
            icon={icon}
            label={label}
            sub={sub}
          />
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-neon/15 bg-neon/[0.055] p-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-neon" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your answer is used only to improve your calorie estimates and recommendations.
        </p>
      </div>
    </div>
  );
}

function NameStep({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const displayName = formatFirstName(value);

  return (
    <div>
      <StepHeader
        title="What is your name?"
        sub="We'll use your name to personalize your journey."
      />

      <label className="block rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 transition focus-within:border-neon/45 focus-within:bg-neon/[0.035]">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          First name
        </span>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.055] text-neon">
            <UserRound className="size-5" />
          </span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, 32))}
            placeholder="Enter your name"
            maxLength={32}
            autoComplete="given-name"
            enterKeyHint="next"
            className="h-14 min-w-0 flex-1 bg-transparent text-xl font-bold outline-none placeholder:text-base placeholder:font-medium placeholder:text-muted-foreground/55"
            aria-label="First name"
          />
        </div>
      </label>

      <AnimatePresence mode="wait">
        {displayName ? (
          <motion.div
            key={displayName}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-5 rounded-2xl border border-neon/15 bg-neon/[0.055] p-4 text-center"
          >
            <p className="text-sm font-semibold">
              Nice to meet you, <span className="text-neon">{displayName}</span>.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              We'll remember this as you move through onboarding.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function GoalStep({
  name,
  value,
  onChange,
}: {
  name?: string;
  value: Goal[];
  onChange: (goals: Goal[]) => void;
}) {
  const items: { id: Goal; icon: typeof Flame; sub: string }[] = [
    { id: "lose_weight", icon: TrendingDown, sub: "Burn fat and slim down" },
    { id: "build_muscle", icon: Dumbbell, sub: "Add lean muscle and strength" },
    { id: "recomp", icon: Layers, sub: "Build muscle while losing fat" },
    { id: "get_stronger", icon: Zap, sub: "Increase strength on your main lifts" },
    { id: "endurance", icon: Activity, sub: "Improve cardio and stamina" },
    { id: "overall", icon: Heart, sub: "Build balanced, all-around fitness" },
    { id: "maintain", icon: Mountain, sub: "Stay sharp and consistent" },
  ];
  return (
    <div>
      <StepHeader
        title={name ? `${name}, what are your goals?` : "What are your goals?"}
        sub="Select all that apply. We'll balance your plan across every choice."
      />
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-neon/15 bg-neon/[0.045] px-4 py-2.5 text-xs">
        <span className="font-semibold text-neon">Choose one or more</span>
        <span className="tabular-nums text-muted-foreground" aria-live="polite">
          {value.length} selected
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map(({ id, icon, sub }) => (
          <ChoiceCard
            key={id}
            active={value.includes(id)}
            onClick={() =>
              onChange(value.includes(id) ? value.filter((goal) => goal !== id) : [...value, id])
            }
            icon={icon}
            label={GOAL_LABELS[id]}
            sub={sub}
          />
        ))}
      </div>
    </div>
  );
}

function ExperienceStep({
  name,
  value,
  currentWorkoutsPerWeek,
  onChange,
  onFrequencyChange,
}: {
  name?: string;
  value: ExperienceLevel;
  currentWorkoutsPerWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  onChange: (v: ExperienceLevel) => void;
  onFrequencyChange: (v: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) => void;
}) {
  const items: { id: ExperienceLevel; sub: string }[] = [
    { id: "beginner", sub: "New to training, learning movements" },
    { id: "intermediate", sub: "Consistent for 6+ months" },
    { id: "advanced", sub: "Experienced lifter, structured programs" },
  ];
  return (
    <div>
      <StepHeader
        title={
          name ? `${name}, what's your training experience?` : "What's your training experience?"
        }
        sub="So we pick the right intensity and volume."
      />
      <div className="space-y-2.5">
        {items.map(({ id, sub }) => (
          <ChoiceCard
            key={id}
            active={value === id}
            onClick={() => onChange(id)}
            label={EXPERIENCE_LABELS[id]}
            sub={sub}
          />
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neon">
              Your current rhythm
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              How many workouts do you complete in a typical week?
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-neon/10 px-2.5 py-1 text-[9px] font-bold text-neon">
            Builds safely
          </span>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-1.5">
          {([0, 1, 2, 3, 4, 5] as const).map((frequency) => {
            const active = currentWorkoutsPerWeek === frequency;
            return (
              <button
                key={frequency}
                type="button"
                onClick={() => onFrequencyChange(frequency)}
                aria-label={
                  frequency === 5
                    ? "5 or more workouts"
                    : `${frequency} ${frequency === 1 ? "workout" : "workouts"}`
                }
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl border text-sm font-bold tabular-nums transition",
                  active
                    ? "border-neon bg-neon text-neon-foreground"
                    : "border-white/[0.06] bg-black/20 text-muted-foreground",
                )}
              >
                {frequency === 5 ? "5+" : frequency}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Ascendr uses this baseline to increase volume gradually instead of overwhelming you.
        </p>
      </div>
    </div>
  );
}

function EquipmentStep({
  value,
  onChange,
}: {
  value: EquipmentSetup;
  onChange: (v: EquipmentSetup) => void;
}) {
  const items: { id: EquipmentSetup; icon: typeof Home; sub: string }[] = [
    { id: "none", icon: Home, sub: "Bodyweight workouts, anywhere" },
    { id: "dumbbells", icon: Dumbbell, sub: "Adjustable or fixed dumbbells" },
    { id: "gym", icon: Building2, sub: "Barbells, machines, cables" },
    { id: "mixed", icon: Layers, sub: "Combination of home + gym" },
  ];
  return (
    <div>
      <StepHeader
        title="Your training setup"
        sub="Choose the equipment your personalized workouts can use."
      />

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neon">
          Where do you train?
        </p>
        <span className="text-[10px] text-muted-foreground">Choose one</span>
      </div>
      <div className="space-y-2.5">
        {items.map(({ id, icon, sub }) => (
          <ChoiceCard
            key={id}
            active={value === id}
            onClick={() => onChange(id)}
            icon={icon}
            label={EQUIPMENT_LABELS[id]}
            sub={sub}
          />
        ))}
      </div>
    </div>
  );
}

function DaysStep({
  value,
  onChange,
}: {
  value: 2 | 3 | 4 | 5 | 6;
  onChange: (v: 2 | 3 | 4 | 5 | 6) => void;
}) {
  const options = [2, 3, 4, 5, 6] as const;
  return (
    <div>
      <StepHeader
        title="Build your weekly rhythm"
        sub="Choose a realistic schedule. We'll design the training around you."
      />
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neon">
        Training days
      </p>
      <div className="grid grid-cols-5 gap-2">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "aspect-square rounded-2xl border flex flex-col items-center justify-center transition",
              value === n
                ? "border-neon bg-neon/10 text-neon"
                : "border-white/[0.06] bg-white/[0.03]",
            )}
          >
            <span className="text-2xl font-extrabold tabular-nums">{n}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              days
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-neon/20 bg-neon/[0.055] p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-neon/10 text-neon">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neon">
              Personalized after onboarding
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Ascendr AI will choose the best training structure for your goals, experience,
              equipment, recovery, and {value}-day schedule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BodyStep({
  d,
  update,
  compact = false,
}: {
  d: Draft;
  update: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  compact?: boolean;
}) {
  const imperial = d.units === "imperial";
  return (
    <div>
      {!compact && (
        <StepHeader
          title="Your body details"
          sub="We use this to calibrate calorie and macro targets."
        />
      )}

      {/* Units toggle */}
      <div className="mb-4 inline-flex rounded-full bg-white/[0.04] border border-white/[0.06] p-1">
        {(["metric", "imperial"] as const).map((u) => (
          <button
            key={u}
            onClick={() => update("units", u)}
            className={cn(
              "px-4 h-9 rounded-full text-xs font-semibold uppercase tracking-wider transition",
              d.units === u ? "bg-neon text-neon-foreground" : "text-muted-foreground",
            )}
          >
            {u === "metric" ? "kg · cm" : "lb · in"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <Slider
          label="Age"
          value={d.age}
          min={14}
          max={80}
          suffix="years"
          onChange={(v) => update("age", v)}
        />

        {imperial ? (
          <HeightImperialSlider valueCm={d.heightCm} onChange={(cm) => update("heightCm", cm)} />
        ) : (
          <Slider
            label="Height"
            value={d.heightCm}
            min={140}
            max={220}
            suffix="cm"
            onChange={(v) => update("heightCm", v)}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          {imperial ? (
            <>
              <WeightImperialSlider
                label="Current weight"
                valueKg={d.currentWeightKg}
                onChange={(kg) => update("currentWeightKg", kg)}
              />
              <WeightImperialSlider
                label="Goal weight"
                valueKg={d.goalWeightKg}
                onChange={(kg) => update("goalWeightKg", kg)}
              />
            </>
          ) : (
            <>
              <Slider
                label="Current weight"
                value={d.currentWeightKg}
                min={40}
                max={180}
                step={0.5}
                suffix="kg"
                onChange={(v) => update("currentWeightKg", v)}
              />
              <Slider
                label="Goal weight"
                value={d.goalWeightKg}
                min={40}
                max={180}
                step={0.5}
                suffix="kg"
                onChange={(v) => update("goalWeightKg", v)}
              />
            </>
          )}
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
            Body fat % (optional)
          </label>
          <input
            inputMode="decimal"
            placeholder="e.g. 18"
            value={d.bodyFatPct ?? ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              update("bodyFatPct", Number.isFinite(v) && v > 0 && v < 70 ? v : undefined);
            }}
            className="mt-2 h-11 w-full rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 text-base tabular-nums outline-none focus:border-neon/40"
          />
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <EditableSliderValue
          label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          suffix={suffix}
          onChange={onChange}
        />
      </div>
      <input
        type="range"
        aria-label={`Adjust ${label.toLowerCase()}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-neon)]"
      />
    </div>
  );
}

function clampMeasurement(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMeasurement(value: number, min: number, step: number) {
  const precision = Number.isInteger(step) ? 0 : (String(step).split(".")[1]?.length ?? 0);
  const rounded = Math.round((value - min) / step) * step + min;
  return Number(rounded.toFixed(precision));
}

function formatMeasurement(value: number, step: number) {
  const precision = Number.isInteger(step) ? 0 : (String(step).split(".")[1]?.length ?? 0);
  return value.toFixed(precision);
}

function EditableSliderValue({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const normalizedValue = roundMeasurement(clampMeasurement(value, min, max), min, step);
  const [typedValue, setTypedValue] = useState(() => formatMeasurement(normalizedValue, step));

  useEffect(() => {
    setTypedValue(formatMeasurement(normalizedValue, step));
  }, [normalizedValue, step]);

  const commitTypedValue = () => {
    const parsed = Number(typedValue);
    if (!Number.isFinite(parsed)) {
      setTypedValue(formatMeasurement(normalizedValue, step));
      return;
    }

    const nextValue = roundMeasurement(clampMeasurement(parsed, min, max), min, step);
    setTypedValue(formatMeasurement(nextValue, step));
    onChange(nextValue);
  };

  return (
    <div className="flex min-w-0 items-center justify-end gap-1.5">
      <input
        type="number"
        inputMode={Number.isInteger(step) ? "numeric" : "decimal"}
        aria-label={`Enter ${label.toLowerCase()}`}
        min={min}
        max={max}
        step={step}
        value={typedValue}
        onChange={(event) => {
          const nextText = event.target.value;
          setTypedValue(nextText);
          const parsed = Number(nextText);
          if (nextText !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
            onChange(roundMeasurement(parsed, min, step));
          }
        }}
        onBlur={commitTypedValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="h-9 w-[4.6rem] rounded-xl border border-white/[0.09] bg-white/[0.05] px-2 text-right text-base font-extrabold tabular-nums text-foreground outline-none transition focus:border-neon/60 focus:bg-neon/[0.06]"
      />
      <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>
    </div>
  );
}

function HeightImperialSlider({
  valueCm,
  onChange,
}: {
  valueCm: number;
  onChange: (cm: number) => void;
}) {
  const totalInches = Math.round(valueCm / 2.54);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Height</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums text-muted-foreground">
            {ft}'{inches}"
          </span>
          <EditableSliderValue
            label="height in inches"
            value={totalInches}
            min={55}
            max={87}
            step={1}
            suffix="in"
            onChange={(nextInches) => onChange(Math.round(nextInches * 2.54))}
          />
        </div>
      </div>
      <input
        type="range"
        aria-label="Adjust height in inches"
        min={55}
        max={87}
        value={totalInches}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 2.54))}
        className="w-full accent-[var(--color-neon)]"
      />
    </div>
  );
}

function WeightImperialSlider({
  label,
  valueKg,
  onChange,
}: {
  label: string;
  valueKg: number;
  onChange: (kg: number) => void;
}) {
  const lb = Math.round(valueKg * 2.20462);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <EditableSliderValue
          label={`${label} in pounds`}
          value={lb}
          min={88}
          max={400}
          step={1}
          suffix="lb"
          onChange={(nextLb) => onChange(nextLb / 2.20462)}
        />
      </div>
      <input
        type="range"
        aria-label={`Adjust ${label.toLowerCase()} in pounds`}
        min={88}
        max={400}
        value={lb}
        onChange={(e) => onChange(Number(e.target.value) / 2.20462)}
        className="w-full accent-[var(--color-neon)]"
      />
    </div>
  );
}

function ActivityStep({
  d,
  update,
}: {
  d: Draft;
  update: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  const items: { id: ActivityLevel; icon: typeof Flame }[] = [
    { id: "sedentary", icon: Heart },
    { id: "light", icon: Activity },
    { id: "moderate", icon: Bike },
    { id: "very", icon: Flame },
    { id: "athlete", icon: Zap },
  ];
  return (
    <div>
      <StepHeader
        title="Daily activity"
        sub="Outside of planned workouts. We use this for TDEE — we won't double-count your training."
      />
      <div className="space-y-2.5">
        {items.map(({ id, icon }) => (
          <ChoiceCard
            key={id}
            active={d.activityLevel === id}
            onClick={() => update("activityLevel", id)}
            icon={icon}
            label={ACTIVITY_LABELS[id]}
            sub={ACTIVITY_DESCRIPTIONS[id]}
          />
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
        <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
          Average daily steps (optional)
        </label>
        <div className="mt-2 flex items-center gap-3">
          <Footprints className="size-5 text-neon shrink-0" />
          <input
            inputMode="numeric"
            placeholder="e.g. 8000"
            value={d.avgStepsPerDay ?? ""}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/[^0-9]/g, ""));
              update("avgStepsPerDay", v > 0 ? v : undefined);
            }}
            className="flex-1 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 text-base tabular-nums outline-none focus:border-neon/40"
          />
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ d }: { d: Draft }) {
  const selectedGoals = d.goals.length ? d.goals : [d.goal];
  const profile = profileFromDraft(d, d.name || "Athlete");
  const nutrition = suggestNutrition(profile);
  const plan = weeklyScheduleService.generateSchedule(profile);
  return (
    <div>
      <StepHeader
        title={`You're ready, ${d.name || "athlete"}`}
        sub="Here's the plan we've tailored to your answers."
      />

      <div className="rounded-3xl border border-neon/30 bg-gradient-to-br from-neon/10 to-transparent p-5">
        <div className="text-[10px] uppercase tracking-wider text-neon font-semibold">
          Your goals
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedGoals.map((goal) => (
            <span
              key={goal}
              className="rounded-full border border-neon/20 bg-neon/10 px-3 py-1.5 text-sm font-bold text-neon"
            >
              {GOAL_LABELS[goal]}
            </span>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {EXPERIENCE_LABELS[d.experience]} · {EQUIPMENT_LABELS[d.equipment]} · AI-designed plan
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Days / wk" value={String(d.daysPerWeek)} />
        <Stat
          label="Adjustments"
          value={d.trainingLimitations?.length ? String(d.trainingLimitations.length) : "None"}
        />
      </div>

      <div className="mt-5 rounded-3xl border border-neon/15 bg-neon/[0.045] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neon">
          Synced across Ascendr
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ConnectedFeature icon={Dumbbell} label="AI workouts" />
          <ConnectedFeature icon={Apple} label="Macro targets" />
          <ConnectedFeature icon={Sparkles} label="Coach context" />
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-white/[0.03] border border-white/[0.05] p-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Daily nutrition · {NUTRITION_LABELS[d.nutritionPlan]}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          <Macro label="kcal" value={nutrition.kcal} highlight />
          <Macro label="P (g)" value={nutrition.protein} />
          <Macro label="C (g)" value={nutrition.carbs} />
          <Macro label="F (g)" value={nutrition.fat} />
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-white/[0.03] border border-white/[0.05] p-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Weekly split
        </div>
        <ul className="mt-3 space-y-1.5">
          {plan.map((day) => (
            <li key={day.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground w-10">{day.dayName.slice(0, 3)}</span>
              <span
                className={cn(
                  "font-medium",
                  day.isRestDay ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {day.splitLabel}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

function ConnectedFeature({ icon: Icon, label }: { icon: typeof Dumbbell; label: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/15 px-2 py-3 text-center">
      <Icon className="mx-auto size-4 text-neon" />
      <p className="mt-2 text-[9px] font-semibold leading-tight text-white/70">{label}</p>
    </div>
  );
}

function Macro({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className={cn("text-xl font-extrabold tabular-nums", highlight && "text-neon")}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

/* -------- New steps -------- */

const REFERRAL_SOURCES: { id: ReferralSource; label: string; icon: typeof Flame }[] = [
  { id: "tiktok", label: "TikTok", icon: Music2 },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "friend", label: "From a friend", icon: Users },
  { id: "appstore", label: "App Store", icon: Smartphone },
  { id: "google", label: "Google search", icon: Search },
  { id: "other", label: "Somewhere else", icon: MoreHorizontal },
];

function ReferralSourceStep({
  value,
  onChange,
}: {
  value: ReferralSource | undefined;
  onChange: (v: ReferralSource) => void;
}) {
  return (
    <div>
      <StepHeader
        title="How did you hear about us?"
        sub="This helps us improve — totally optional."
      />
      <div className="space-y-2.5">
        {REFERRAL_SOURCES.map(({ id, label, icon }) => (
          <ChoiceCard
            key={id}
            active={value === id}
            onClick={() => onChange(id)}
            icon={icon}
            label={label}
          />
        ))}
      </div>
    </div>
  );
}

function CommitmentStep({ name, d }: { name: string; d: Draft }) {
  const mainGoal = GOAL_LABELS[d.goals[0] ?? d.goal];

  return (
    <div>
      <div className="relative overflow-hidden rounded-[30px] border border-neon/25 bg-gradient-to-br from-neon/[0.14] via-white/[0.035] to-transparent p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-neon/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neon">
            <Heart className="size-4 fill-neon/20" /> A promise to your future self
          </div>
          <h2 className="mt-5 text-[30px] font-black leading-[1.05] tracking-[-0.04em]">
            {name || "You"}, if we build the plan, will you show up for it?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Not perfectly. Consistently. Follow the plan, log honestly, and keep coming back long
            enough to give your progress a real chance to show.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[26px] border border-white/[0.07] bg-white/[0.025] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Your commitment
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { value: `${d.daysPerWeek}x`, label: "each week" },
            { value: "1%", label: "better daily" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.06] bg-black/20 px-2 py-3 text-center"
            >
              <p className="text-xl font-black text-neon">{item.value}</p>
              <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-neon/[0.08] p-4">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-neon text-neon-foreground">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <div>
            <p className="text-sm font-bold">Your plan will be built around your life.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              We will tailor every week toward {mainGoal.toLowerCase()} and adapt as you record your
              progress.
            </p>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-5 max-w-[32ch] text-center text-sm font-semibold leading-relaxed">
        You do not need another perfect start. You need a plan you are willing to return to.
      </p>
    </div>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not prepare preview photo."));
    reader.readAsDataURL(blob);
  });
}

async function prepareBodyScanPreviewPhoto(photo: string) {
  const original = await fetch(photo).then((response) => response.blob());
  const file = new File([original], "body-scan-preview", {
    type: original.type || "image/jpeg",
  });
  return blobToDataUrl(await compressImage(file, 1200, 0.78));
}

function BodyScanTeaserStep({ onUnlock, onSkip }: { onUnlock: () => void; onSkip: () => void }) {
  const analyzePreview = useServerFn(analyzeBodyScanPreview);
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewResult, setPreviewResult] = useState<BodyScanPreviewResult | null>(null);
  const [error, setError] = useState("");

  const continueToUnlock = async () => {
    if (!photo || saving) return;
    setSaving(true);
    setError("");
    try {
      await savePendingBodyScan(photo);
      const previewPhoto = await prepareBodyScanPreviewPhoto(photo);
      const [nextPreview] = await Promise.all([
        analyzePreview({ data: { photo: previewPhoto } }),
        new Promise((resolve) => window.setTimeout(resolve, 4200)),
      ]);
      setPreviewResult(nextPreview);
    } catch (pendingError) {
      console.error("Could not prepare the onboarding Body Scan preview:", pendingError);
      setError(
        pendingError instanceof Error
          ? pendingError.message
          : "Ascendr couldn't prepare that Body Scan preview. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (saving && photo) {
    return (
      <div className="fixed inset-0 z-[90] bg-black">
        <ScanAnalysisProgress photo={photo} scanType="body" preview />
      </div>
    );
  }

  if (previewResult && photo) {
    return (
      <LockedBodyScanPreview
        photo={photo}
        preview={previewResult}
        onUnlock={onUnlock}
        onRetry={() => {
          setPreviewResult(null);
          setPhoto(null);
        }}
      />
    );
  }

  if (!acceptedOffer) {
    return (
      <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col pb-safe">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neon">
            Ascendr Vision
          </p>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            Optional
          </span>
        </div>

        <h2 className="mt-3 max-w-[12ch] text-[2rem] font-black leading-[1.02] tracking-[-0.05em]">
          Want to see your physique potential?
        </h2>
        <p className="mt-2.5 max-w-[38ch] text-[13px] leading-relaxed text-muted-foreground">
          One private photo reveals visible strengths and gives you a focused improvement plan.
        </p>

        <div className="relative mt-4 h-[318px] overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#0c0f0d] shadow-2xl shadow-black/40">
          <img
            src="/media/ascendr-sample-body-scan.png"
            alt="Sample athlete used to demonstrate an Ascendr analysis report"
            className="absolute inset-0 h-full w-full object-contain object-center opacity-75"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-black/20 to-black/90" />
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(163,255,68,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(163,255,68,.055) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="pointer-events-none absolute -left-20 top-8 size-56 rounded-full bg-neon/[0.09] blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 size-52 rounded-full bg-neon/[0.06] blur-3xl" />

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-neon text-neon-foreground">
                <ScanLine className="size-4" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-neon">
                  Body Scan
                </p>
                <p className="text-[10px] font-bold text-white">Locked preview</p>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full border border-neon/15 bg-neon/[0.07] px-2 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-neon">
              <LockKeyhole className="size-2.5" /> Private
            </span>
          </div>

          <div className="absolute left-5 right-14 top-[62px] rotate-[-1.5deg] rounded-[24px] border border-neon/25 bg-gradient-to-br from-black/80 via-black/65 to-black/45 p-4 shadow-[0_22px_50px_rgba(0,0,0,.55)] backdrop-blur-[2px]">
            <div className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-3">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Overall physique rating
                </p>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className="text-[2.65rem] font-black leading-none tracking-[-0.07em] text-white">
                    76
                  </span>
                  <span className="mb-1 text-[8px] font-black text-neon">/100</span>
                </div>
              </div>
              <div className="mb-0.5 rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-2 text-right">
                <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Body fat range
                </p>
                <span className="mt-1.5 block h-4 w-12 rounded bg-neon/15 blur-[3px]" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                { label: "Muscle", width: "78%" },
                { label: "V-taper", width: "84%" },
                { label: "Symmetry", width: "87%" },
                { label: "Potential", width: "88%" },
                { label: "Shoulders", width: "83%" },
                { label: "Core", width: "85%" },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {metric.label}
                    </span>
                    <LockKeyhole className="size-2.5 text-neon/75" />
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-neon shadow-[0_0_8px_rgba(163,255,68,.45)]"
                      style={{ width: metric.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 w-[54%] rotate-[2deg] rounded-2xl border border-white/[0.09] bg-[#181c19]/95 p-3 shadow-xl shadow-black/50 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[7px] font-black uppercase tracking-[0.18em] text-neon">
                Your next move
              </p>
              <LockKeyhole className="size-3 text-neon" />
            </div>
            <p className="mt-1.5 text-[11px] font-extrabold leading-tight text-white/65">
              Unlock your personalized plan
            </p>
            <div className="mt-2 h-2 w-4/5 rounded bg-white/10 blur-[2px]" />
          </div>

          <div className="pointer-events-none absolute left-3 right-3 top-[154px] h-px bg-neon shadow-[0_0_14px_3px_rgba(163,255,68,.45)]" />
        </div>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={() => setAcceptedOffer(true)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon font-bold text-neon-foreground glow-neon transition active:scale-[0.98]"
          >
            Preview My Body Analysis
            <ArrowRight className="size-5" />
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
          >
            Maybe later
          </button>
        </div>

        <div className="mt-1 flex items-center justify-center gap-2 text-[9px] text-muted-foreground">
          <LockKeyhole className="size-3 text-neon" />
          No photo or scan is required to continue.
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        title="Add one photo"
        sub="You chose to preview your Body Scan. You can still skip whenever you want."
      />

      <button
        type="button"
        onClick={() => {
          setAcceptedOffer(false);
          setPhoto(null);
          setPreviewResult(null);
          setError("");
        }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to the offer
      </button>

      <div className="rounded-3xl border border-neon/20 bg-gradient-to-br from-neon/[0.08] via-transparent to-transparent p-1">
        <PhotoSlot
          label="Your full-body photo"
          capture="environment"
          value={photo}
          onChange={(nextPhoto) => {
            setPhoto(nextPhoto);
            setPreviewResult(null);
            setError("");
          }}
          hint="Take one still photo with your full body visible from head to toe and the camera level."
        />
      </div>

      <div className="mt-4 rounded-[22px] border border-white/[0.06] bg-white/[0.025] p-4">
        <div className="flex items-center gap-2">
          <LockKeyhole className="size-4 text-neon" />
          <p className="text-xs font-semibold">Photo quality checklist</p>
        </div>
        <div className="mt-3 grid gap-2">
          {[
            "Head-to-toe in frame",
            "Level camera and even lighting",
            "Natural stance in fitted gymwear",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Check className="size-3.5 text-neon" /> {item}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Ascendr uses a limited AI check to score this preview. Body-fat details, factor numbers,
          and your improvement plan stay locked until you subscribe.
        </p>
      </div>

      {photo && (
        <div className="mt-4 rounded-2xl border border-neon/20 bg-neon/[0.06] p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neon text-neon-foreground">
              <Check className="size-5" strokeWidth={3} />
            </span>
            <div>
              <p className="text-sm font-bold">Your photo is ready</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Prepare your photo-specific preview. No account or sign-in is required.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => void continueToUnlock()}
        disabled={!photo || saving}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon font-bold text-neon-foreground glow-neon transition active:scale-[0.98] disabled:opacity-40"
      >
        {saving ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
        {saving ? "Preparing Preview" : "Preview My Body Scan"}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold text-muted-foreground transition hover:text-foreground"
      >
        Maybe later — continue setup
      </button>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
        Results are a visual fitness opinion, not a medical assessment or body-composition
        measurement.
      </p>
    </div>
  );
}

/* -------- Customizing plan loader -------- */

const PLAN_STEPS = [
  "Analyzing your goal",
  "Building your workout plan",
  "Setting your calorie target",
  "Matching exercises to your equipment",
  "Personalizing your nutrition",
  "Preparing your dashboard",
];

function CustomizingPlan({
  ready,
  plan,
  onDone,
}: {
  ready: boolean;
  plan: SavedWorkoutPlan | null;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((current) => {
        const cap = ready ? 1 : 0.92;
        const increment = current < 0.7 ? 0.018 : 0.007;
        return Math.min(cap, current + increment);
      });
    }, 50);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (!ready || progress < 1) return;
    const id = setTimeout(onDone, 1100);
    return () => clearTimeout(id);
  }, [ready, progress, onDone]);

  const currentStep = Math.min(PLAN_STEPS.length, Math.floor(progress * PLAN_STEPS.length) + 1);
  const complete = ready && progress >= 1;
  const progressPercent = Math.round(progress * 100);
  const currentLabel = complete ? "Your plan is ready" : PLAN_STEPS[currentStep - 1];

  return (
    <div className="relative min-h-dvh min-w-0 overflow-x-clip bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:px-6">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-neon/[0.09] blur-[110px]" />
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-center justify-between border-b border-white/[0.07] pb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">
            Ascendr
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Plan build · {currentStep} / {PLAN_STEPS.length}
          </span>
        </header>

        <main className="pt-7">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.018)_55%,rgba(183,255,62,0.075))] p-5 shadow-[0_24px_65px_-42px_rgba(0,0,0,0.95)]">
            <div className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-neon/20 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">
                  {complete ? "Complete" : "Crafting your routine"}
                </p>
                <h2 className="mt-3 max-w-[9ch] text-[31px] font-black leading-[1.02] tracking-[-0.055em]">
                  {complete ? "Your plan is set." : "Your plan is taking shape."}
                </h2>
                <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-muted-foreground">
                  {complete
                    ? "Everything is ready for your first session."
                    : "Matching training, recovery, and nutrition into one rhythm."}
                </p>
              </div>
              <div
                className="grid size-[5.3rem] shrink-0 place-items-center rounded-full p-[5px] shadow-[0_0_34px_rgba(183,255,62,0.18)]"
                style={{
                  background: `conic-gradient(#b7ff3e ${progressPercent}%, rgba(255,255,255,0.1) 0)`,
                }}
                aria-label={`${progressPercent}% complete`}
              >
                <div className="grid size-full place-items-center rounded-full bg-[#101210] text-center">
                  <span className="text-[22px] font-black leading-none tracking-[-0.06em]">
                    {progressPercent}
                  </span>
                  <span className="-mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.09]">
              <motion.div
                className="h-full rounded-full bg-neon shadow-[0_0_16px_rgba(183,255,62,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
          </section>

          <section className="mt-4 rounded-[1.6rem] border border-neon/20 bg-neon/[0.055] p-4">
            <div className="flex items-center gap-3">
              <span className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-neon/35 bg-neon/[0.08] text-neon">
                {!complete && (
                  <span className="absolute size-5 animate-ping rounded-full bg-neon/15" />
                )}
                {complete ? (
                  <Check className="relative size-4" strokeWidth={3} />
                ) : (
                  <Sparkles className="relative size-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-neon">
                  {complete ? "Ready to go" : "Fine-tuning now"}
                </span>
                <span className="mt-1 block truncate text-sm font-bold">{currentLabel}</span>
              </span>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
              <div>
                <p className="text-xs font-black">Your training blueprint</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Built from the details you shared.
                </p>
              </div>
              <span className="rounded-full border border-white/[0.1] px-2.5 py-1 text-[9px] font-bold text-white/70">
                Adaptive
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-px bg-white/[0.06]">
              {PLAN_STEPS.map((label, i) => {
                const done = complete || i < currentStep - 1;
                const active = !complete && i === currentStep - 1;
                return (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: done || active ? 1 : 0.42, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex min-h-16 items-center gap-2.5 bg-[#0b0d0c] px-3 py-3"
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-lg border text-[9px] font-black",
                        done
                          ? "border-neon bg-neon text-neon-foreground"
                          : active
                            ? "border-neon/60 bg-neon/[0.1] text-neon"
                            : "border-white/10 text-muted-foreground",
                      )}
                    >
                      {done ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : active ? (
                        <motion.span
                          className="size-1.5 rounded-full bg-neon"
                          animate={{ opacity: [0.35, 1, 0.35] }}
                          transition={{ repeat: Infinity, duration: 1.1 }}
                        />
                      ) : (
                        `0${i + 1}`
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold leading-snug",
                        active && "text-neon",
                      )}
                    >
                      {label}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </section>

          {complete && plan && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-[1.6rem] border border-neon/20 bg-neon/[0.055] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-extrabold">{plan.name}</p>
                <span className="shrink-0 rounded-full bg-neon/10 px-2 py-1 text-[8px] font-bold uppercase text-neon">
                  {plan.source === "ai" ? "AI built" : "Smart matched"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                {plan.summary}
              </p>
            </motion.section>
          )}

          <p className="mx-auto mt-5 max-w-[34ch] text-center text-[11px] leading-relaxed text-muted-foreground">
            We’re using your goals, schedule, and setup to make the first week feel achievable.
          </p>
        </main>
      </div>
    </div>
  );
}
