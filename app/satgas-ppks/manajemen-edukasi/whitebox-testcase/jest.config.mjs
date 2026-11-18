import path from "node:path";
import { fileURLToPath } from "node:url";
import nextJest from "next/jest.js";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(configDirectory, "../../../..");
const createJestConfig = nextJest({ dir: rootDir });

export default createJestConfig({
  rootDir,
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/app/satgas-ppks/manajemen-edukasi/whitebox-testcase/us18-manajemen-edukasi.ts",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
});