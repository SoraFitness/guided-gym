const DB_NAME = "ascendr-private-scans";
const STORE_NAME = "pending-scans";
const RECORD_KEY = "onboarding-body-scan";
const SESSION_KEY = "ascendr:pending-body-scan";

export interface PendingBodyScan {
  id: typeof RECORD_KEY;
  photo: string;
  createdAt: string;
  submissionId?: string;
}

let memoryRecord: PendingBodyScan | null = null;

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

function saveSessionFallback(record: PendingBodyScan) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
  } catch {
    // Large photos can exceed sessionStorage. The in-memory record still survives SPA navigation.
  }
}

function readSessionFallback(): PendingBodyScan | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingBodyScan>;
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

export async function savePendingBodyScan(photo: string, submissionId?: string) {
  const record: PendingBodyScan = {
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

export async function getPendingBodyScan(): Promise<PendingBodyScan | null> {
  if (memoryRecord) return memoryRecord;

  const database = await openDatabase();
  if (database) {
    const record = await new Promise<PendingBodyScan | null>((resolve) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(RECORD_KEY);
      request.onsuccess = () => resolve((request.result as PendingBodyScan | undefined) ?? null);
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

export async function clearPendingBodyScan() {
  memoryRecord = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage restrictions; IndexedDB and memory are cleared independently.
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
