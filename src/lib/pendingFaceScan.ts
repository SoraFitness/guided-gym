const DB_NAME = "ascendr-private-scans";
const STORE_NAME = "pending-scans";
const RECORD_KEY = "onboarding-face-scan";
const SESSION_KEY = "ascendr:pending-face-scan";

export interface PendingFaceScan {
  id: typeof RECORD_KEY;
  photo: string;
  createdAt: string;
  submissionId?: string;
}

let memoryRecord: PendingFaceScan | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function saveSessionFallback(record: PendingFaceScan) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
  } catch {
    // IndexedDB and the in-memory copy remain available when storage is restricted.
  }
}

function readSessionFallback(): PendingFaceScan | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingFaceScan>;
    return parsed.id === RECORD_KEY && typeof parsed.photo === "string"
      ? {
          id: RECORD_KEY,
          photo: parsed.photo,
          createdAt:
            typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
          submissionId: typeof parsed.submissionId === "string" ? parsed.submissionId : undefined,
        }
      : null;
  } catch {
    return null;
  }
}

export async function savePendingFaceScan(photo: string, submissionId?: string) {
  const record: PendingFaceScan = {
    id: RECORD_KEY,
    photo,
    createdAt: new Date().toISOString(),
    submissionId,
  };
  memoryRecord = record;
  saveSessionFallback(record);

  const database = await openDatabase();
  if (!database) return record;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  database.close();
  return record;
}

export async function getPendingFaceScan(): Promise<PendingFaceScan | null> {
  if (memoryRecord) return memoryRecord;

  const database = await openDatabase();
  if (database) {
    const record = await new Promise<PendingFaceScan | null>((resolve) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(RECORD_KEY);
      request.onsuccess = () => resolve((request.result as PendingFaceScan | undefined) ?? null);
      request.onerror = () => resolve(null);
    });
    database.close();
    if (record?.photo) {
      memoryRecord = record;
      return record;
    }
  }

  const fallback = readSessionFallback();
  memoryRecord = fallback;
  return fallback;
}

export async function clearPendingFaceScan() {
  memoryRecord = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // IndexedDB and memory are cleared independently.
  }

  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(RECORD_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  database.close();
}
