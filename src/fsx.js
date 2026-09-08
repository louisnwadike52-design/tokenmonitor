import { createReadStream } from "node:fs";
import { opendir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";

/** Recursively yields paths of files under `dir` whose name ends in `extension`. */
export async function* walkFiles(dir, extension) {
  let entries;
  try {
    entries = await opendir(dir);
  } catch {
    return; // missing or unreadable directory — nothing to yield
  }
  for await (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(path, extension);
    else if (entry.isFile() && entry.name.endsWith(extension)) yield path;
  }
}

/** Yields one parsed object per JSONL line, skipping blank and corrupt lines. */
export async function* jsonlObjects(filePath) {
  const lines = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });
  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch {
        // corrupt line — skip it rather than failing the whole file
      }
    }
  } catch {
    // unreadable file — treat as empty
  }
}

/** Parses a JSON file, returning null if it is missing or malformed. */
export async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}
