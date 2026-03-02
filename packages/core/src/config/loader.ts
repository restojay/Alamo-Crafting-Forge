import { readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { SubsidiaryConfig } from "./types";
import { validateConfig } from "./schema";

export interface LoadResult {
  configs: SubsidiaryConfig[];
  errors: { file: string; messages: string[] }[];
}

/**
 * Load and validate all `.config.ts` files from a directory.
 *
 * Valid configs are returned in the `configs` array.
 * Invalid files are collected in the `errors` array — the loader never crashes.
 */
export async function loadConfigs(directory: string): Promise<LoadResult> {
  const absDir = resolve(directory);
  const entries = await readdir(absDir);
  const configFiles = entries.filter((f) => f.endsWith(".config.ts"));

  const configs: SubsidiaryConfig[] = [];
  const errors: LoadResult["errors"] = [];

  for (const file of configFiles) {
    const fullPath = join(absDir, file);
    try {
      const fileUrl = pathToFileURL(fullPath).href;
      const mod = await import(fileUrl);
      const exported = mod.default ?? mod.config ?? mod;

      const result = validateConfig(exported);
      if (result.valid) {
        configs.push(result.config);
      } else {
        errors.push({ file, messages: result.errors });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ file, messages: [`Import failed: ${msg}`] });
    }
  }

  return { configs, errors };
}
