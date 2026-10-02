-- Accounts that existed before email verification shipped were never asked to
-- confirm, so treat them as confirmed. Without this they would be silently
-- blocked from creating chatbots by a rule that did not exist when they signed
-- up. Runs once, so it only ever affects accounts predating the feature.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
