// Flat-config ESLint for Next.js 16 (`next lint` was removed in v16).
//
// eslint-config-next@16.2.9 exposes flat config via subpath exports, NOT a
// `.flatConfig.coreWebVitals` property. The `/core-web-vitals` entry's default
// export is a flat-config ARRAY (base Next config + Core Web Vitals rules),
// so we spread it directly. Verified against the installed package's
// dist/core-web-vitals.js and package.json "exports".
import next from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...next,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/lib/database.types.ts",
    ],
  },
];

export default eslintConfig;
