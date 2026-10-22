import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Los hooks de carga de datos (useFetch, buscadores con debounce) sincronizan estado dentro de efectos a propósito.
      "react-hooks/set-state-in-effect": "off",
      // El logo de la empresa es un data-URL (base64); next/image no aplica.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;