import { useSyncExternalStore } from "react";
import type { FoodSearchResult } from "./foodSearch.functions";

// Compact record stored locally for Recent + Favorites.
// We keep a normalized snapshot independent of the API source so it survives
// even if the upstream provider returns different results next time.
export interface StoredFood {
  id: string; // stable, same as search result id (preset:..., nutritionix:..., usda:..., off:..., custom:<uuid>)
  source: FoodSearchResult["source"] | "custom";
  brand?: string;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  verified: boolean;
  category?: FoodSearchResult["category"];
  imageUrl?: string;
  nutrients?: FoodSearchResult["nutrients"];
  lastUsedAt?: string; // ISO, recent list only
}

const RECENT_KEY = "fitness:foodrecent";
const FAV_KEY = "fitness:foodfavs";
const MAX_RECENT = 20;
const EVT = "fitness:foodhistory-change";

function read(key: string): StoredFood[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function write(key: string, list: StoredFood[]) {
  localStorage.setItem(key, JSON.stringify(list));
}
function emit() {
  recentCache = null;
  favCache = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

let recentCache: StoredFood[] | null = null;
let favCache: StoredFood[] | null = null;

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const invalidate = () => {
    recentCache = null;
    favCache = null;
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === RECENT_KEY || e.key === FAV_KEY) invalidate();
  };
  window.addEventListener(EVT, invalidate);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, invalidate);
    window.removeEventListener("storage", onStorage);
  };
}

const getRecent = () => (recentCache ??= read(RECENT_KEY));
const getFavs = () => (favCache ??= read(FAV_KEY));
const empty: StoredFood[] = [];

export function useRecentFoods(): StoredFood[] {
  return useSyncExternalStore(subscribe, getRecent, () => empty);
}
export function useFavoriteFoods(): StoredFood[] {
  return useSyncExternalStore(subscribe, getFavs, () => empty);
}

export function pushRecent(food: StoredFood) {
  const list = read(RECENT_KEY).filter((x) => x.id !== food.id);
  list.unshift({ ...food, lastUsedAt: new Date().toISOString() });
  write(RECENT_KEY, list.slice(0, MAX_RECENT));
  emit();
}

export function isFavorite(id: string): boolean {
  return read(FAV_KEY).some((x) => x.id === id);
}

export function toggleFavorite(food: StoredFood): boolean {
  const list = read(FAV_KEY);
  const idx = list.findIndex((x) => x.id === food.id);
  let nowFav: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    nowFav = false;
  } else {
    list.unshift(food);
    nowFav = true;
  }
  write(FAV_KEY, list);
  emit();
  return nowFav;
}

// Snapshots + bulk replace (used by cloud sync).
export function getRecentFoodsSnapshot(): StoredFood[] {
  return read(RECENT_KEY);
}
export function getFavoriteFoodsSnapshot(): StoredFood[] {
  return read(FAV_KEY);
}
export function replaceFoodHistory(recent: StoredFood[], favorites: StoredFood[]) {
  write(RECENT_KEY, recent.slice(0, MAX_RECENT));
  write(FAV_KEY, favorites);
  emit();
}

export function resultToStored(r: FoodSearchResult): StoredFood {
  return {
    id: r.id,
    source: r.source,
    brand: r.brand,
    name: r.name,
    serving: r.serving,
    kcal: r.kcal,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    verified: r.verified,
    category: r.category,
    imageUrl: r.imageUrl,
    nutrients: r.nutrients,
  };
}
