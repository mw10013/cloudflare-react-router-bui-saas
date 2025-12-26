import path from "node:path";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersProject(async () => {
  const migrationsPath = path.join(__dirname, "../../migrations");
  const migrations = await readD1Migrations(migrationsPath);
  return {
    plugins: [
      tsconfigPaths({
        projects: [path.resolve(__dirname, "../../tsconfig.json")],
      }),
    ],
    ssr: {
      // Cloudflare workers runtime can't import named exports from CommonJS deps (e.g. `import { tabbable } from "tabbable"`).
      // Bundle these so Vite rewrites CJS/ESM interop for tests.
      noExternal: ["better-auth", "@better-auth/stripe", "@base-ui/react", "tabbable"],
    },
    test: {
      include: ["*.test.ts"],
      setupFiles: ["../apply-migrations.ts"],
      poolOptions: {
        workers: {
          main: "../test-worker.ts",
          isolatedStorage: false,
          singleWorker: true,
          wrangler: {
            configPath: "../../wrangler.jsonc",
          },
          miniflare: {
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
