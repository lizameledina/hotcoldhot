-- CreateEnum
CREATE TYPE "FeelingAfter" AS ENUM ('ENERGIZED', 'NORMAL', 'HARD');

-- AlterTable
ALTER TABLE "Preset"
ADD COLUMN     "progressionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "increaseStepSec" INTEGER,
ADD COLUMN     "increaseEveryNDays" INTEGER,
ADD COLUMN     "maxColdDurationSec" INTEGER,
ADD COLUMN     "lastProgressionAppliedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session"
ADD COLUMN     "feelingAfter" "FeelingAfter";
