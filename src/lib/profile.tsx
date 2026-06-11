import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Goal = "muscle" | "lose" | "recomp" | "energy";
export type Gender = "male" | "female" | "other";
export type Location = "home" | "gym";

export interface Profile {
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activityLevel: number; // 1-5
  location: Location;
  equipment: string[];
  diet: string;
  injuries: string;
  completedAt: string;
}

const KEY = "fitness:profile";

interface Ctx {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  ready: boolean;
}

const ProfileContext = createContext<Ctx>({ profile: null, setProfile: () => {}, ready: false });

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfileState(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const setProfile = (p: Profile | null) => {
    setProfileState(p);
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, ready }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
