import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_BACKUP_REMINDER_INTERVAL_MS,
  hasUnreadAccountBackupNotification,
  markAccountBackupNotificationRead,
  recordAccountBackupReminderShown,
  shouldShowAccountBackupReminder,
} from "./accountBackupReminder";

describe("account backup reminder", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the first reminder and records it as unread", () => {
    expect(shouldShowAccountBackupReminder(1_000)).toBe(true);

    recordAccountBackupReminderShown(1_000);

    expect(shouldShowAccountBackupReminder(1_001)).toBe(false);
    expect(hasUnreadAccountBackupNotification()).toBe(true);
  });

  it("shows the reminder again after the two-day interval", () => {
    recordAccountBackupReminderShown(1_000);
    markAccountBackupNotificationRead(1_001);

    expect(shouldShowAccountBackupReminder(1_000 + ACCOUNT_BACKUP_REMINDER_INTERVAL_MS - 1)).toBe(
      false,
    );
    expect(shouldShowAccountBackupReminder(1_000 + ACCOUNT_BACKUP_REMINDER_INTERVAL_MS)).toBe(true);

    recordAccountBackupReminderShown(1_000 + ACCOUNT_BACKUP_REMINDER_INTERVAL_MS);
    expect(hasUnreadAccountBackupNotification()).toBe(true);
  });
});
