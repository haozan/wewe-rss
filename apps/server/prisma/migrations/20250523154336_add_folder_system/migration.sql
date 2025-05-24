-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_feeds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mp_name" TEXT NOT NULL,
    "mp_cover" TEXT NOT NULL,
    "mp_intro" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "sync_time" INTEGER NOT NULL DEFAULT 0,
    "update_time" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "has_history" INTEGER DEFAULT 1,
    "folder_id" TEXT,
    CONSTRAINT "feeds_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_feeds" ("created_at", "has_history", "id", "mp_cover", "mp_intro", "mp_name", "status", "sync_time", "update_time", "updated_at") SELECT "created_at", "has_history", "id", "mp_cover", "mp_intro", "mp_name", "status", "sync_time", "update_time", "updated_at" FROM "feeds";
DROP TABLE "feeds";
ALTER TABLE "new_feeds" RENAME TO "feeds";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
