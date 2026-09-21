import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const contentDirectory = join(projectRoot, "content", "scene2-layer2");
const outputPath = join(contentDirectory, "timeline-content.js");

const filenames = (await readdir(contentDirectory))
  .filter((filename) => /^\d{2}-\d{4}\.md$/.test(filename))
  .sort();

const entries = await Promise.all(
  filenames.map(async (filename) => [filename, await readFile(join(contentDirectory, filename), "utf8")]),
);

const output = `/* This file is generated from the timeline Markdown files. */\n`+
  `globalThis.JCT20_TIMELINE_CONTENT = Object.freeze(${JSON.stringify(Object.fromEntries(entries), null, 2)});\n`;

await writeFile(outputPath, output, "utf8");
console.log(`Bundled ${entries.length} timeline files into ${outputPath}`);
