const ACCOUNT_BACKUP_REMINDER_KEY = "ascendr:account-backup-reminder:v1";
export const ACCOUNT_BACKUP_REMINDER_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;

interface AccountBackupReminderState {
  lastPromptAt: number | null;
  notificationReadAt: number | null;
}

function readReminderState(): AccountBackupReminderState {
  if (typeof window === "undefined") {
    return { lastPromptAt: null, notificationReadAt: null };
  }

  try {
    const value = localStorage.getItem(ACCOUNT_BACKUP_REMINDER_KEY);
    if (!value) return { lastPromptAt: null, notificationReadAt: null };

    const parsed = JSON.parse(value) as Partial<AccountBackupReminderState>;
    return {
      lastPromptAt: typeof parsed.lastPromptAt === "number" ? parsed.lastPromptAt : null,
      notificationReadAt:
        typeof parsed.notificationReadAt === "number" ? parsed.notificationReadAt : null,
    };
  } catch {
    return { lastPromptAt: null, notificationReadAt: null };
  }
}

function writeReminderState(state: AccountBackupReminderState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNT_BACKUP_REMINDER_KEY, JSON.stringify(state));
}

export function shouldShowAccountBackupReminder(now = Date.now()) {
  const { lastPromptAt } = readReminderState();
  return lastPromptAt === null || now - lastPromptAt >= ACCOUNT_BACKUP_REMINDER_INTERVAL_MS;
}

export function recordAccountBackupReminderShown(now = Date.now()) {
  const state = readReminderState();
  writeReminderState({ ...state, lastPromptAt: now });
}

export function hasUnreadAccountBackupNotification() {
  const { lastPromptAt, notificationReadAt } = readReminderState();
  return lastPromptAt === null || notificationReadAt === null || notificationReadAt < lastPromptAt;
}

export function markAccountBackupNotificationRead(now = Date.now()) {
  const state = readReminderState();
  writeReminderState({ ...state, notificationReadAt: now });
}
