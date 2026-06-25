#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// publish-skill.mjs — build the "ceo-report-upload" skill zip and REPLACE it in S3.
//
// The portal serves this object at GET /api/skill/ceo-report-upload. The zip is
// NOT committed to the repo nor baked into the image — it lives only in S3.
// Run this whenever the skill changes:  npm run publish:skill
//
// Requires S3 credentials in the environment (loaded from app/api/.env or repo .env):
//   S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET
// ─────────────────────────────────────────────────────────────────────────────
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url)); // app/api/scripts
// Load env (already-set vars always win; load both app/api/.env and repo-root .env)
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

const KEY = "skills/ceo-report-upload.zip";
const skillsDir = resolve(__dirname, "../../../.claude/skills"); // repo/.claude/skills

// 1. Build the zip into a buffer straight from the canonical skill source
//    (exclude the *.test.mjs file). `zip - ` writes the archive to stdout.
console.log("Building skill zip from .claude/skills/ceo-report-upload ...");
const zipBuf = execSync(
  `cd "${skillsDir}" && zip -rqX - ceo-report-upload -x '*.test.mjs'`,
  { maxBuffer: 64 * 1024 * 1024, shell: "/bin/bash" },
);

// 2. Configure the S3 client identically to S3Service (CMC Cloud, path-style)
const bucket = process.env.S3_BUCKET ?? "ceo-reports";
const accessKeyId = process.env.S3_ACCESS_KEY ?? "";
const secretAccessKey = process.env.S3_SECRET_KEY ?? "";
if (!accessKeyId || !secretAccessKey) {
  console.error(
    "✗ Thiếu S3_ACCESS_KEY / S3_SECRET_KEY trong môi trường. Hãy đặt biến S3_* rồi chạy lại.",
  );
  process.exit(1);
}
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "https://s3.cmccloud.vn",
  region: process.env.S3_REGION ?? "hcm",
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

// 3. Delete the old object, then put the new one (explicit "replace")
try {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: KEY }));
  console.log("Removed previous object.");
} catch {
  // No previous object (first publish) — ignore.
}
await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: KEY,
    Body: zipBuf,
    ContentType: "application/zip",
  }),
);

console.log(`✅ Published skill → s3://${bucket}/${KEY} (${zipBuf.length} bytes)`);
