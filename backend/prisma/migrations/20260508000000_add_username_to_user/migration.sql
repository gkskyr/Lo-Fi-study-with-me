-- Mevcut kayıtlara geçici username atanır, sonra NOT NULL yapılır
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;

UPDATE "User" SET "username" = 'user_' || SUBSTRING(id, 1, 8) WHERE "username" IS NULL;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
