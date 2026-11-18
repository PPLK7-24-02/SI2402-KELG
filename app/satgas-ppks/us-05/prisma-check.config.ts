import { defineConfig } from "prisma/config";

// Offline schema validation / generation only. No dotenv, datasource, or seed.
export default defineConfig({ schema: "../../../prisma/schema.prisma" });
