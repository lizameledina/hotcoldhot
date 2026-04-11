-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "bestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCompletedDate" TEXT,
ADD COLUMN     "lastReminderDate" TEXT,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderTime" TEXT;
