import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Carpetas que no se revisan
  { ignores: ["dist/", "coverage/", "node_modules/"] },

  // Reglas recomendadas de ESLint y de TypeScript
  js.configs.recommended,
  tseslint.configs.recommended,

  // El código se ejecuta en Node.js
  {
    languageOptions: {
      globals: globals.node,
    },
  },

  // Nuestras reglas
  {
    rules: {
      eqeqeq: "error", // === en vez de ==
      "no-var": "error", // let o const en vez de var
      "prefer-const": "error", // const si la variable no cambia
      "no-empty": "error", // nada de bloques vacíos
      "@typescript-eslint/no-explicit-any": "error", // nada de any
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" }, // _req, _next: parámetros que no usamos a propósito
      ],
    },
  },
);
