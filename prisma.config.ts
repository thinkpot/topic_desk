// Prisma 6 stops auto-loading .env once this config file exists, so the CLI
// needs it loaded explicitly. (Next.js loads .env on its own at runtime.)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.mjs",
  },
});
