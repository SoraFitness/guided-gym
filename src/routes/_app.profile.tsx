import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Settings,
  ChevronRight,
  Target,
  Dumbbell,
  Apple,
  Flame,
  Sparkles,
  Check,
  BarChart3,
  ScanLine,
  Compass,
  UserRound,
  Cloud,
  ShieldCheck,
  Loader2,
  Layers3,
  MessageCircleQuestion,
  CalendarDays,
  CreditCard,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  useProfile,
  GOAL_LABELS,
  GOAL_OPTIONS,
  EQUIPMENT_LABELS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LABELS,
  deriveEquipmentSetup,
} from "@/lib/profile";
import { isAccountSession, useAuthSession, type AuthSession } from "@/lib/authSession";
import { importCoachMessages, type StoredCoachMessage } from "@/lib/coach.functions";
import { syncProfileToCloud } from "@/lib/profileSync";
import { syncLocalProgressPhotosToCloud } from "@/lib/progressPhotos.local";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODEL_LABELS, DEMO_MODEL_OPTIONS } from "@/lib/demoModel";
import { loadGoals, type NutritionGoals } from "@/lib/foods";
import { setNutritionGoals } from "@/lib/nutritionStore";
import { suggestNutrition } from "@/lib/nutritionService";
import { resetTour } from "@/lib/tourStore";
import { getSubscriptionDaysRemaining, useSubscription } from "@/lib/subscription";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ProgressPicturesCard } from "@/components/photos/ProgressPicturesCard";
import {
  getWorkoutSplitOption,
  WORKOUT_SPLIT_OPTIONS,
  type WorkoutSplitId,
} from "@/lib/workoutSplits";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Ascendr" }] }),
  component: ProfilePage,
});

type SheetKind = null | "goal" | "workoutSplit" | "equipment" | "injuries" | "demoModel";

function ProfilePage() {
  const { profile, setProfile, updateProfile } = useProfile();
  const session = useAuthSession();
  const accountSession = isAccountSession(session) ? session : null;
  const subscription = useSubscription();
  const navigate = useNavigate();
  const [goals, setGoalsState] = useState<NutritionGoals>(loadGoals());
  const [saved, setSaved] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetKind>(null);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profileSyncState, setProfileSyncState] = useState<"idle" | "syncing" | "synced" | "error">(
    "idle",
  );
  const syncAttemptedRef = useRef(false);

  useEffect(() => {
    if (!accountSession || syncAttemptedRef.current) return;
    const signedInSession = accountSession;
    const guestCoachMessagesKey = "fitness:guest-coach-messages";
    syncAttemptedRef.current = true;

    const readGuestCoachMessages = (): StoredCoachMessage[] => {
      try {
        const raw = localStorage.getItem(guestCoachMessagesKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown[];
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter((message): message is Record<string, unknown> => {
            if (!message || typeof message !== "object") return false;
            const m = message as Record<string, unknown>;
            return m.role === "user" || m.role === "assistant";
          })
          .map((message) => ({
            id: String(message.id),
            role: message.role as "user" | "assistant",
            parts: (message.parts ?? []) as object,
          }));
      } catch {
        return [];
      }
    };

    const syncGuestData = async () => {
      const coachMessages = readGuestCoachMessages();
      const [coachResult, photosResult] = await Promise.all([
        coachMessages.length
          ? importCoachMessages({ data: { messages: coachMessages } })
          : Promise.resolve({ imported: 0 }),
        syncLocalProgressPhotosToCloud(signedInSession.userId),
      ]);

      if (coachResult.imported > 0) localStorage.setItem(guestCoachMessagesKey, "[]");
      if (coachResult.imported > 0 || photosResult.synced > 0) {
        toast.success("Guest data synced to your account");
      }
    };

    syncGuestData().catch((error) => {
      console.error(error);
      toast.error("Couldn't sync all guest data yet");
    });
  }, [accountSession]);

  useEffect(() => {
    if (!accountSession || !profile) return;

    let active = true;
    setProfileSyncState("syncing");
    syncProfileToCloud(accountSession.userId, profile)
      .then(() => {
        if (active) setProfileSyncState("synced");
      })
      .catch((error) => {
        console.error(error);
        if (active) setProfileSyncState("error");
      });

    return () => {
      active = false;
    };
  }, [accountSession, profile]);

  async function signOut() {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) toast.error(error.message);
      else toast.success("Signed out");
    } finally {
      setSigningOut(false);
    }
  }

  const accountSection =
    session === "loading" ? (
      <section className="mt-5 rounded-3xl border border-border bg-surface p-4 flex items-center gap-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking account status...</span>
      </section>
    ) : !accountSession ? (
      <section className="mt-5 rounded-3xl border border-border bg-surface p-4 text-sm text-muted-foreground">
        Secure your account to view and sync your profile.
      </section>
    ) : (
      <section className="mt-5 rounded-3xl border border-neon/20 bg-neon/[0.055] p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-neon/15 text-neon">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">Ascendr account saved</h3>
              <Cloud className="size-3.5 text-neon" />
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {profileSyncState === "syncing"
                ? "Syncing your profile to Supabase..."
                : profileSyncState === "error"
                  ? "Signed in. Profile sync will retry when Supabase is ready."
                  : "Profile synced to Ascendr database."}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="h-9 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </section>
    );

  const daysRemaining = getSubscriptionDaysRemaining(subscription.expiresAt);
  const subscriptionPlan = subscription.plan
    ? `${subscription.plan.charAt(0).toUpperCase()}${subscription.plan.slice(1)}`
    : "Premium";
  const subscriptionDate = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
  const hasValidSubscriptionDate =
    subscriptionDate !== null && !Number.isNaN(subscriptionDate.getTime());
  const subscriptionDateLabel = hasValidSubscriptionDate
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(subscriptionDate)
    : null;
  const subscriptionStatus = !subscription.ready
    ? "Checking your Ascendr Pro membership..."
    : subscription.active && daysRemaining !== null
      ? subscription.willRenew === false
        ? daysRemaining === 0
          ? "Your access ends today"
          : `Your access ends in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`
        : daysRemaining === 0
          ? "Renews today"
          : `Renews in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`
      : subscription.active
        ? "Your Ascendr Pro access is active"
        : subscription.renewalRequired
          ? "Your Ascendr Pro access has ended"
          : "No active Ascendr Pro subscription";

  const subscriptionSection = (
    <section className="mt-4 overflow-hidden rounded-3xl border border-neon/20 bg-surface">
      <div className="flex items-start gap-3 p-4">
        <div className="grid size-10 place-items-center rounded-2xl bg-neon/15 text-neon">
          <CreditCard className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">
                Membership
              </p>
              <h3 className="mt-0.5 text-sm font-bold">Ascendr Pro · {subscriptionPlan}</h3>
            </div>
            {subscription.ready && subscription.active && (
              <span className="rounded-full border border-neon/25 bg-neon/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-neon">
                Active
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{subscriptionStatus}</p>
          {subscriptionDateLabel && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="size-3.5 text-neon" />
              {subscription.willRenew === false ? "Access through" : "Next billing date"}{" "}
              {subscriptionDateLabel}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-white/[0.06] p-3">
        <a
          href="https://apps.apple.com/account/subscriptions"
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-semibold text-foreground transition active:scale-[0.98]"
        >
          Manage subscription
          <ExternalLink className="size-4" />
        </a>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Cancel or change your plan in Apple App Store subscriptions.
        </p>
      </div>
    </section>
  );

  if (!profile) {
    return (
      <div className="px-4 pb-32 pt-5 animate-slide-up sm:px-5">
        <header className="px-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">Profile</p>
          <h1 className="mt-1 text-[29px] font-extrabold leading-tight tracking-[-0.04em]">
            Make Ascendr yours.
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            A few details unlock personalized training and nutrition.
          </p>
        </header>

        {accountSection}

        <section className="relative mt-5 overflow-hidden rounded-[28px] border border-neon/20 bg-gradient-to-br from-neon/[0.11] via-surface to-surface p-5">
          <div className="absolute -right-12 -top-12 size-36 rounded-full bg-neon/10 blur-3xl" />
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-white/[0.06] text-neon">
              <UserRound className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">Finish your Ascendr profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your goals, training level, equipment, and demo model preference.
              </p>
              <Link
                to="/onboarding"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-neon px-5 text-sm font-semibold text-neon-foreground glow-neon"
              >
                Set up profile
              </Link>
            </div>
          </div>
        </section>

        <ProfileLegalFooter />
      </div>
    );
  }

  const equipmentItems = profile.equipmentItems?.length
    ? profile.equipmentItems
    : [EQUIPMENT_LABELS[profile.equipment]];

  const deleteProfile = async () => {
    setDeletingProfile(true);

    try {
      if (accountSession) {
        const { error } = await supabase
          .from("user_profiles")
          .delete()
          .eq("user_id", accountSession.userId);
        if (error) throw error;
      }

      setProfile(null);
      resetTour();
      setConfirmDeleteProfile(false);
      toast.success("Profile deleted");
      navigate({ to: "/onboarding" });
    } catch (error) {
      console.error("[profile] Could not delete profile", error);
      toast.error("We couldn't delete your profile. Please try again.");
    } finally {
      setDeletingProfile(false);
    }
  };

  const restartTour = () => {
    resetTour();
    navigate({ to: "/home" });
  };

  const update = (k: keyof NutritionGoals, v: string) => {
    setGoalsState({ ...goals, [k]: Number(v.replace(/[^0-9]/g, "")) || 0 });
    setSaved(false);
  };
  const save = () => {
    setNutritionGoals(goals);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const suggest = () => {
    setGoalsState(suggestNutrition(profile));
    setSaved(false);
  };

  return (
    <div className="px-4 pt-5 pb-32 animate-slide-up sm:px-5">
      <header className="flex items-start justify-between gap-4 px-1">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">Profile</p>
          <h1 className="mt-1 text-[29px] font-extrabold leading-tight tracking-[-0.04em]">
            Built around you.
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Your goals, preferences, progress, and account.
          </p>
        </div>
        <a
          href="#profile-preferences"
          aria-label="Profile preferences"
          className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.06] bg-surface transition active:scale-95"
        >
          <Settings className="size-5" />
        </a>
      </header>

      <section className="relative mt-5 overflow-hidden rounded-[28px] border border-neon/15 bg-gradient-to-br from-neon/[0.11] via-surface to-surface p-5">
        <div className="absolute -right-12 -top-12 size-40 rounded-full bg-neon/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-[22px] bg-neon text-2xl font-extrabold text-neon-foreground shadow-[0_0_30px_-14px_var(--color-neon)]">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-extrabold">{profile.name}</h2>
              {session && session !== "loading" && <ShieldCheck className="size-4 text-neon" />}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {profile.age} years · {profile.heightCm} cm · {profile.currentWeightKg} kg
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-black/15 px-2.5 py-1 text-[9px] font-semibold text-white/65">
              <Sparkles className="size-3 text-neon" /> Personalized by Ascendr
            </span>
          </div>
        </div>
      </section>

      {accountSection}
      {subscriptionSection}

      <section className="mt-4 grid grid-cols-3 gap-2.5">
        <Mini label="Goal" value={GOAL_LABELS[profile.goal].split(" ")[0]} />
        <Mini label="Level" value={EXPERIENCE_LABELS[profile.experience]} />
        <Mini
          label="Trains"
          value={
            profile.equipment === "gym" ? "Gym" : profile.equipment === "none" ? "Home" : "Mixed"
          }
        />
      </section>

      <div className="mt-7">
        <SectionTitle eyebrow="Timeline" title="Visual progress" detail="Private progress photos" />
        <ProgressPicturesCard />
      </div>

      {/* Nutrition Goals */}
      <section className="mt-7">
        <SectionTitle eyebrow="Targets" title="Nutrition goals" detail="Used in your daily log" />
        <div className="rounded-[28px] border border-white/[0.05] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-neon" />
              <h3 className="font-bold">Daily macro targets</h3>
            </div>
            <button
              onClick={suggest}
              className="text-[11px] font-semibold text-neon flex items-center gap-1"
            >
              <Sparkles className="size-3" /> Suggest
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Daily targets used across the Nutrition tab.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <GoalField
              label="Calories"
              suffix="kcal"
              value={goals.kcal}
              onChange={(v) => update("kcal", v)}
            />
            <GoalField
              label="Protein"
              suffix="g"
              value={goals.protein}
              onChange={(v) => update("protein", v)}
            />
            <GoalField
              label="Carbs"
              suffix="g"
              value={goals.carbs}
              onChange={(v) => update("carbs", v)}
            />
            <GoalField
              label="Fat"
              suffix="g"
              value={goals.fat}
              onChange={(v) => update("fat", v)}
            />
          </div>

          <button
            onClick={save}
            className="mt-4 w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2 glow-neon active:scale-[0.98]"
          >
            {saved ? (
              <>
                <Check className="size-4" /> Saved
              </>
            ) : (
              "Save Nutrition Goals"
            )}
          </button>
        </div>
      </section>

      <section id="profile-preferences" className="mt-7 scroll-mt-5">
        <SectionTitle
          eyebrow="Personalization"
          title="Training preferences"
          detail="Tune every recommendation"
        />
        <div className="divide-y divide-border overflow-hidden rounded-[26px] border border-white/[0.05] bg-surface">
          <button
            type="button"
            onClick={() => setOpenSheet("goal")}
            className="block w-full text-left active:bg-white/[0.03]"
          >
            <RowContent icon={Target} label="Primary goal" value={GOAL_LABELS[profile.goal]} />
          </button>
          <button
            type="button"
            onClick={() => setOpenSheet("workoutSplit")}
            className="block w-full text-left active:bg-white/[0.03]"
          >
            <RowContent
              icon={Layers3}
              label="Workout split"
              value={getWorkoutSplitOption(profile.workoutSplit).name}
            />
          </button>
          <button
            type="button"
            onClick={() => setOpenSheet("equipment")}
            className="block w-full text-left active:bg-white/[0.03]"
          >
            <RowContent icon={Dumbbell} label="Equipment" value={equipmentItems.join(", ")} />
          </button>
          <button
            type="button"
            onClick={() => setOpenSheet("demoModel")}
            className="block w-full text-left active:bg-white/[0.03]"
          >
            <RowContent
              icon={UserRound}
              label="Exercise demo model"
              value={DEMO_MODEL_LABELS[profile.demoModelPreference ?? "auto"]}
            />
          </button>
          <button
            type="button"
            onClick={() => setOpenSheet("injuries")}
            className="block w-full text-left active:bg-white/[0.03]"
          >
            <RowContent
              icon={Apple}
              label="Injuries and notes"
              value={profile.injuries?.trim() ? profile.injuries.split("\n")[0] : "No notes added"}
            />
          </button>
        </div>
      </section>

      <section data-tour="tour-profile-settings" className="mt-7">
        <SectionTitle
          eyebrow="Account"
          title="Progress and app"
          detail="History, scans, and help"
        />
        <div className="divide-y divide-border overflow-hidden rounded-[26px] border border-white/[0.05] bg-surface">
          <Link to="/progress" className="block active:bg-white/[0.03]">
            <RowContent
              icon={BarChart3}
              label="Progress dashboard"
              value="Workouts, streaks, and trends"
            />
          </Link>
          <Link to="/scan" className="block active:bg-white/[0.03]">
            <RowContent icon={ScanLine} label="Scan center" value="Face and body assessments" />
          </Link>
          <Link to="/contact" className="block active:bg-white/[0.03]">
            <RowContent
              icon={MessageCircleQuestion}
              label="Contact support"
              value="Questions, feedback, or account help"
            />
          </Link>
          <button
            type="button"
            onClick={restartTour}
            className="block w-full text-left active:bg-white/[0.03]"
          >
            <RowContent
              icon={Compass}
              label="Ascendr tour"
              value="Restart the guided walkthrough"
            />
          </button>
        </div>
      </section>

      <button
        onClick={() => setConfirmDeleteProfile(true)}
        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-destructive/15 bg-destructive/[0.035] text-xs font-semibold text-destructive"
      >
        <Trash2 className="size-5" />
        Delete profile
      </button>

      <ProfileLegalFooter />

      {/* Goal sheet */}
      <Sheet open={openSheet === "goal"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="bg-background border-border rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Choose your goal</SheetTitle>
            <SheetDescription>Used to personalize your workouts and nutrition.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  updateProfile({ goal: g, goals: [g] });
                  setOpenSheet(null);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 h-14 rounded-2xl border text-left",
                  profile.goal === g
                    ? "border-neon bg-neon/10 text-foreground"
                    : "border-border bg-surface text-foreground/90",
                )}
              >
                <span className="font-medium">{GOAL_LABELS[g]}</span>
                {profile.goal === g && <Check className="size-5 text-neon" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Workout split sheet */}
      <Sheet open={openSheet === "workoutSplit"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[86dvh] overflow-y-auto rounded-t-3xl border-border bg-background"
        >
          <SheetHeader>
            <SheetTitle>Choose your workout split</SheetTitle>
            <SheetDescription>
              Ascendr adapts every split to your goal, equipment, level, and training days.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2 pb-4">
            {WORKOUT_SPLIT_OPTIONS.map((option) => {
              const selected = option.id === (profile.workoutSplit ?? "auto");
              const idealForSchedule = option.recommendedDays.includes(profile.daysPerWeek);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    updateProfile({ workoutSplit: option.id as WorkoutSplitId });
                    setOpenSheet(null);
                  }}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left",
                    selected
                      ? "border-neon bg-neon/10"
                      : "border-border bg-surface text-foreground/90",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{option.name}</span>
                        {option.badge && (
                          <span className="rounded-full bg-neon/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neon">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-[10px] font-semibold",
                          idealForSchedule ? "text-neon" : "text-amber-300/80",
                        )}
                      >
                        {idealForSchedule
                          ? option.bestFor
                          : `${option.bestFor} · adapted to ${profile.daysPerWeek} days`}
                      </p>
                    </div>
                    {selected && <Check className="mt-1 size-5 shrink-0 text-neon" />}
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Equipment sheet */}
      <EquipmentSheet
        open={openSheet === "equipment"}
        initial={equipmentItems}
        onClose={() => setOpenSheet(null)}
        onSave={(items) => {
          updateProfile({ equipmentItems: items, equipment: deriveEquipmentSetup(items) });
          setOpenSheet(null);
        }}
      />

      {/* Injuries sheet */}
      <InjuriesSheet
        open={openSheet === "injuries"}
        initial={profile.injuries ?? ""}
        onClose={() => setOpenSheet(null)}
        onSave={(text) => {
          updateProfile({ injuries: text });
          setOpenSheet(null);
        }}
      />

      <DemoModelSheet
        open={openSheet === "demoModel"}
        selected={profile.demoModelPreference ?? "auto"}
        onClose={() => setOpenSheet(null)}
        onSave={(demoModelPreference) => {
          updateProfile({ demoModelPreference });
          setOpenSheet(null);
        }}
      />

      <AlertDialog
        open={confirmDeleteProfile}
        onOpenChange={(open) => {
          if (!deletingProfile) setConfirmDeleteProfile(open);
        }}
      >
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete your profile, onboarding answers, and personalization from this device and
              Supabase? Your Ascendr account, membership, and saved progress will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingProfile}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingProfile}
              onClick={(event) => {
                event.preventDefault();
                void deleteProfile();
              }}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingProfile && <Loader2 className="size-4 animate-spin" />}
              {deletingProfile ? "Deleting..." : "Delete Profile"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DemoModelSheet({
  open,
  selected,
  onClose,
  onSave,
}: {
  open: boolean;
  selected: (typeof DEMO_MODEL_OPTIONS)[number];
  onClose: () => void;
  onSave: (value: (typeof DEMO_MODEL_OPTIONS)[number]) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Demonstration model</SheetTitle>
          <SheetDescription>Choose the model used for 3D exercise demonstrations.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {DEMO_MODEL_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => onSave(option)}
              className={cn(
                "w-full flex items-center justify-between px-4 h-14 rounded-2xl border text-left",
                selected === option ? "border-neon bg-neon/10" : "border-border bg-surface",
              )}
            >
              <span className="font-medium">{DEMO_MODEL_LABELS[option]}</span>
              {selected === option && <Check className="size-5 text-neon" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EquipmentSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string[];
  onClose: () => void;
  onSave: (items: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);

  const toggle = (item: string) => {
    setSelected((cur) => {
      if (item === "No equipment") return ["No equipment"];
      const without = cur.filter((i) => i !== "No equipment");
      return without.includes(item) ? without.filter((i) => i !== item) : [...without, item];
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-background border-border rounded-t-3xl max-h-[85dvh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Your equipment</SheetTitle>
          <SheetDescription>
            Pick everything you have. We'll use it to build your workouts.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((item) => {
            const on = selected.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggle(item)}
                className={cn(
                  "h-14 px-3 rounded-2xl border text-sm font-medium flex items-center justify-between text-left",
                  on ? "border-neon bg-neon/10" : "border-border bg-surface",
                )}
              >
                <span className="truncate">{item}</span>
                {on && <Check className="size-4 text-neon shrink-0" />}
              </button>
            );
          })}
        </div>
        <SheetFooter className="mt-5">
          <button
            onClick={() => onSave(selected.length ? selected : ["No equipment"])}
            className="w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold"
          >
            Save
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function InjuriesSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Injuries & notes</SheetTitle>
          <SheetDescription>
            Add anything we should know — injuries, limitations, exercises to avoid.
          </SheetDescription>
        </SheetHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"e.g. Bad knees\nAvoid shoulder press\nNo jumping exercises"}
          className="mt-4 min-h-32 bg-surface border-border"
        />
        <SheetFooter className="mt-4">
          <button
            onClick={() => onSave(text.trim())}
            className="w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold"
          >
            Save notes
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function GoalField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1 relative">
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 pr-12 text-base font-semibold tabular-nums outline-none focus:border-neon/40"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function SectionTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">{eyebrow}</p>
        <h2 className="mt-0.5 text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
      </div>
      {detail && <p className="mb-0.5 text-[9px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3 text-center">
      <div className="truncate text-[12px] font-extrabold capitalize text-neon">{value}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function RowContent({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="w-full flex items-center gap-4 p-4">
      <span className="size-10 rounded-xl bg-surface-2 grid place-items-center shrink-0">
        <Icon className="size-5 text-neon" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
      <ChevronRight className="size-5 text-muted-foreground shrink-0" />
    </div>
  );
}

function ProfileLegalFooter() {
  return (
    <footer className="mt-8 border-t border-white/[0.055] px-2 pb-2 pt-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Ascendr</p>
      <p className="mt-1.5 text-[10px] text-muted-foreground">Train with direction.</p>
      <nav
        aria-label="Legal and support"
        className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2"
      >
        <Link to="/terms" className="text-[10px] font-medium text-white/60 hover:text-neon">
          Terms of Service
        </Link>
        <Link to="/privacy" className="text-[10px] font-medium text-white/60 hover:text-neon">
          Privacy Policy
        </Link>
        <Link
          to="/health-disclaimer"
          className="text-[10px] font-medium text-white/60 hover:text-neon"
        >
          Health & AI Disclaimer
        </Link>
        <Link to="/contact" className="text-[10px] font-medium text-white/60 hover:text-neon">
          Contact
        </Link>
        <Link
          to="/delete-account"
          className="text-[10px] font-medium text-white/60 hover:text-neon"
        >
          Delete Account
        </Link>
      </nav>
      <p className="mt-4 text-[9px] text-white/30">© 2026 Ascendr. All rights reserved.</p>
    </footer>
  );
}
