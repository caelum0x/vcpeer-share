-- AlterTable
ALTER TABLE "Share" ADD COLUMN "source" TEXT;

-- CreateTable
CREATE TABLE "ShareAccessEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shareId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "country" TEXT,
    "referrer" TEXT,
    CONSTRAINT "ShareAccessEvent_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ShareAccessEvent_shareId_idx" ON "ShareAccessEvent"("shareId");

-- CreateIndex
CREATE INDEX "ShareAccessEvent_shareId_createdAt_idx" ON "ShareAccessEvent"("shareId", "createdAt");
