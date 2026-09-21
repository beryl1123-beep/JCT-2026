#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const sourcePath = process.argv[2];
const outputPath = process.argv[3] || path.resolve("content/scene4/fireflies.json");

if (!sourcePath) {
  console.error("用法：node scripts/feishu-csv-to-fireflies.mjs <飞书导出的CSV> [输出JSON]");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (quoted) {
      if (character === '"' && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function firstValue(record, aliases) {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeType(value) {
  return /网页|网址|website|url/i.test(value) ? "website" : "text";
}

function isApproved(value) {
  return /^(approved|已通过|通过|✓ 已通过|✅通过)$/i.test(value.replace(/\s+/g, " ").trim());
}

const csvText = fs.readFileSync(path.resolve(sourcePath), "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(csvText).filter((row) => row.some((cell) => cell.trim()));

if (rows.length < 2) {
  console.error("CSV 没有可转换的数据行。");
  process.exit(1);
}

const headers = rows[0].map((header) => header.trim());
const records = rows.slice(1).map((values, rowIndex) => {
  const source = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  const type = normalizeType(firstValue(source, ["内容类型", "类型"]));
  const title = firstValue(source, ["标题", "微光标题"]);
  const content = firstValue(source, ["微光正文", "内容", "祝福语"]);
  const url = firstValue(source, ["🔗 网址链接", "网址链接", "网页链接", "链接"]);
  const signature = firstValue(source, ["署名", "昵称"]);
  const reviewValue = firstValue(source, ["审核状态", "是否审核通过", "展示状态"]);
  const createdAt = firstValue(source, ["创建时间", "提交时间"]);
  const sourceId = firstValue(source, ["飞书记录 ID", "飞书记录ID", "记录 ID", "记录ID", "id"]);
  const record = {
    id: sourceId || `light-${String(rowIndex + 1).padStart(3, "0")}`,
    type,
    title,
    content,
    signature,
    reviewStatus: isApproved(reviewValue) ? "approved" : "pending",
    createdAt: createdAt || `row-${String(rowIndex + 1).padStart(6, "0")}`,
  };

  if (type === "website" && url) {
    record.url = url;
  }

  return record;
}).filter((record) => record.reviewStatus === "approved" && (record.content || record.url));

fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(records, null, 2)}\n`);
console.log(`已写入 ${records.length} 条审核通过的内容：${path.resolve(outputPath)}`);
