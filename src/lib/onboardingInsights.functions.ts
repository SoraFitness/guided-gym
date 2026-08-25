import { supabase } from "@/integrations/supabase/client";

type Attribution = {
  landingPath: string;
  referrerHost: string | null;
  referralSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  locale: string | null;
};

type StartedInput = {
  visitorId: string;
  flowVersion: string;
  attribution: Attribution;
};

type CompletedInput = StartedInput & { responses: Record<string, unknown> };

async function invokeOnboarding<T>(action: string, payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("onboarding", {
    body: { action, ...(payload === undefined ? {} : { payload }) },
  });
  if (error) throw error;
  return data as T;
}

export async function captureOnboardingStarted({ data }: { data: StartedInput }) {
  return invokeOnboarding<{ ok: true }>("started", data);
}

export async function captureOnboardingCompleted({ data }: { data: CompletedInput }) {
  return invokeOnboarding<{ ok: true }>("completed", data);
}

export type OnboardingInsights = {
  started: number;
  completed: number;
  completionRate: number;
  sources: { label: string; count: number }[];
  goals: { label: string; count: number }[];
  motivations: { label: string; count: number }[];
  weeklyDays: { label: string; count: number }[];
  recent: {
    createdAt: string;
    completed: boolean;
    source: string;
    goal: string | null;
    motivation: string | null;
  }[];
};

export async function getOnboardingInsights(_input: { data: Record<string, never> }) {
  return invokeOnboarding<OnboardingInsights>("insights");
}
