import securityRules from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "assets/**",
      "variant-blue/**",
      "src/**",
      "server/**",
      "*.js",
      "*.ts",
    ],
  },
  {
    files: ["firestore.rules", "DRAFT_firestore.rules"],
    ...securityRules.configs["flat/recommended"],
  },
];
