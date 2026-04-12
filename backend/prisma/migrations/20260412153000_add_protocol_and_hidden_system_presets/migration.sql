ALTER TABLE "public"."Preset"
ADD COLUMN "protocol" JSONB;

CREATE TABLE "public"."HiddenSystemPreset" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "presetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HiddenSystemPreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HiddenSystemPreset_userId_presetId_key" ON "public"."HiddenSystemPreset"("userId", "presetId");
CREATE INDEX "HiddenSystemPreset_userId_idx" ON "public"."HiddenSystemPreset"("userId");
CREATE INDEX "HiddenSystemPreset_presetId_idx" ON "public"."HiddenSystemPreset"("presetId");

ALTER TABLE "public"."HiddenSystemPreset"
ADD CONSTRAINT "HiddenSystemPreset_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."HiddenSystemPreset"
ADD CONSTRAINT "HiddenSystemPreset_presetId_fkey"
FOREIGN KEY ("presetId") REFERENCES "public"."Preset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
