#!/usr/bin/env npx ts-node
/**
 * Generate component docs from TypeScript definitions.
 * Run: npx ts-node scripts/generate-component-docs.ts
 * Or add to package.json: "gen-docs": "ts-node scripts/generate-component-docs.ts"
 *
 * Placeholder: scans src/components for .tsx files and writes minimal docs
 * if component-docs/{Name}.md does not exist.
 */

import * as fs from "fs";
import * as path from "path";

const COMPONENTS_DIR = path.join(__dirname, "../src/components");
const DOCS_DIR = path.join(__dirname, "../component-docs");

function main() {
  if (!fs.existsSync(COMPONENTS_DIR)) return;
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const files = fs.readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith(".tsx"));
  for (const file of files) {
    const name = path.basename(file, ".tsx");
    const docPath = path.join(DOCS_DIR, `${name}.md`);
    if (!fs.existsSync(docPath)) {
      const content = `# ${name}\n\nProps: see component source.\n`;
      fs.writeFileSync(docPath, content);
      console.log(`Created ${name}.md`);
    }
  }
}

main();
