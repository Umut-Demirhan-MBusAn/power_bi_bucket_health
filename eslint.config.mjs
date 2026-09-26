import powerbiVisualsConfigs from "eslint-plugin-powerbi-visuals";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";

// typescript-eslint's flat/recommended is an array of partial configs (parser setup,
// then two rule sets). None of them declare `files` narrower than "**/*.ts", so we
// pin each entry to src/**/*.ts to keep the stricter TS rules off the plain-JS tests.
const typescriptEslintRecommended = tsEslintPlugin.configs["flat/recommended"].map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
}));

export default [
    powerbiVisualsConfigs.configs.recommended,
    ...typescriptEslintRecommended,
    {
        ignores: ["node_modules/**", "dist/**", ".vscode/**", ".tmp/**", "scripts/**", ".claude/**", "coverage/**"],
    },
];
