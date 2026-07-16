const fs = require("fs");
const path = require("path");

const root = process.cwd();
const sourcePath = path.join(root, "contracts", "api-contracts.ts");

const targets = [
  path.join(root, "backend", "src", "contracts", "generated-contracts.ts"),
  path.join(
    root,
    "frontend",
    "src",
    "app",
    "core",
    "contracts",
    "generated-contracts.ts",
  ),
];

const source = fs.readFileSync(sourcePath, "utf8");
const header = `/* AUTO-GENERATED FILE. Do not edit directly.\n * Source: contracts/api-contracts.ts\n * Run: npm run contracts:sync\n */\n\n`;

for (const targetPath of targets) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, header + source, "utf8");
  console.log(`Synced contracts -> ${path.relative(root, targetPath)}`);
}
