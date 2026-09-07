// @ts-check
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "example/node_modules/**",
      "example/dist/**"
    ]
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    }
  },

  // v7 ships flat configs under `configs.flat`; the top-level ones are eslintrc-shaped.
  {
    files: ["**/*.{ts,tsx}"],
    ...reactHooks.configs.flat["recommended-latest"]
  },

  {
    files: ["test/**/*.{ts,tsx}"],
    // Tests define throwaway components inline inside `it()` bodies.
    rules: { "react-hooks/rules-of-hooks": "off" }
  },

  // Must be last: turns off every rule that fights Prettier.
  prettierConfig
);
