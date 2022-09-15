/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution")

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    sourceType: "module",
    requireConfigFile: false,
  },
  extends: [
    "@vue/typescript/recommended",
    "plugin:vue/vue3-recommended",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: [
    "static/**/*",
    "./helpers/backend/graphql.ts",
    "**/*.d.ts",
    "types/**/*",
  ],
  plugins: ["vue", "prettier"],
  // add your custom rules here
  rules: {
    semi: [2, "never"],
    "import/named": "off", // because, named import issue with typescript see: https://github.com/typescript-eslint/typescript-eslint/issues/154
    // TODO: Check if this still works in Vue 3 + Vite ?
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "prettier/prettier": "warn",
    "vue/multi-word-component-names": "off",
    "import/no-named-as-default": "off",
    "import/no-named-as-default-member": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "import/default": "off",
    "no-undef": "off",
    // localStorage block
    "no-restricted-globals": [
      "error",
      {
        name: "localStorage",
        message:
          "Do not use 'localStorage' directly. Please use localpersistence.ts functions or stores",
      },
    ],
    // window.localStorage block
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.object.property.name='localStorage']",
        message:
          "Do not use 'localStorage' directly. Please use localpersistence.ts functions or stores",
      },
    ],
  },
}
