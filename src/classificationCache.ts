import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Workaround for the TimeLog list-paging bug: the live API only returns the
// first 10 of N classification records (see docs/runbooks/empirical-put-test.md).
// This module loads a manually-maintained cache so list_project_types can return
// the full known set. The cache file lives at <repo>/data — one level above both
// src/ (vitest) and dist/ (runtime), so the relative path resolves in both.

export interface ClassificationEntry {
  id: number;
  name: string;
}

export interface ClassificationCache {
  projectTypes: ClassificationEntry[];
  projectCategories: ClassificationEntry[];
}

const CACHE_PATH = join(dirname(fileURLToPath(import.meta.url)), "../data/classification-cache.json");

let memo: ClassificationCache | null = null;

export function loadClassificationCache(): ClassificationCache {
  if (memo) return memo;
  try {
    const raw = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Partial<ClassificationCache>;
    memo = {
      projectTypes: raw.projectTypes ?? [],
      projectCategories: raw.projectCategories ?? [],
    };
  } catch {
    // A missing/broken cache must not break the live tools — degrade to empty.
    memo = { projectTypes: [], projectCategories: [] };
  }
  return memo;
}
