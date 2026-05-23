CREATE TABLE "role_permissions" (
  "role" TEXT NOT NULL PRIMARY KEY,
  "results_access" TEXT NOT NULL DEFAULT 'none'
);

-- Seed defaults: moderator can see all, user sees nothing by default
INSERT INTO "role_permissions" ("role", "results_access") VALUES ('moderator', 'all'), ('user', 'none');
