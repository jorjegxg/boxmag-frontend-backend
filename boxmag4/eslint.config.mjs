import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler rules from eslint-config-next 16.4. The flagged code
      // mostly syncs localStorage/sessionStorage into state after mount, which
      // must stay in an effect to avoid SSR hydration mismatches. Keep them
      // visible as warnings and migrate case by case.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // `_name` marks an intentionally unused binding (e.g. `catch (_error)`).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Chai assertions such as `expect(x).to.be.true` are expressions.
    files: ["cypress/**/*.ts"],
    rules: { "@typescript-eslint/no-unused-expressions": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
