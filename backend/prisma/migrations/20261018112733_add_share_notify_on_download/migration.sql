-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShareSecurity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" TEXT,
    "maxViews" INTEGER,
    "restrictToRecipients" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnDownload" BOOLEAN NOT NULL DEFAULT false,
    "shareId" TEXT,
    CONSTRAINT "ShareSecurity_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShareSecurity" ("createdAt", "id", "maxViews", "password", "restrictToRecipients", "shareId") SELECT "createdAt", "id", "maxViews", "password", "restrictToRecipients", "shareId" FROM "ShareSecurity";
DROP TABLE "ShareSecurity";
ALTER TABLE "new_ShareSecurity" RENAME TO "ShareSecurity";
CREATE UNIQUE INDEX "ShareSecurity_shareId_key" ON "ShareSecurity"("shareId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
