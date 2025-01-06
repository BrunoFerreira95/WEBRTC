import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Desabilitar regras problemáticas
      "@typescript-eslint/no-unused-vars": "off", // Ignorar variáveis não utilizadas
      "@typescript-eslint/no-explicit-any": "off", // Permitir o uso de 'any'
      "@typescript-eslint/no-unused-expressions": "off", // Permitir expressões não utilizadas
      "react-hooks/rules-of-hooks": "off", // Ignorar regras de hooks
      "react-hooks/exhaustive-deps": "off", // Ignorar dependências faltando em hooks

      // Preferências opcionais
      "prefer-const": "off", // Permitir uso de 'let' mesmo que seja constante
    },
  },
];

export default eslintConfig;
