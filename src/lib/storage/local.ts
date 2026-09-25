import "server-only";
import { copyFile, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import type { Storage } from "./index";

const ROOT = path.join(process.cwd(), "public", "uploads");

/** Dev-only storage: writes under public/uploads, served by Next at /uploads/*. */
export function createLocalStorage(): Storage {
  return {
    async put(key, data, _contentType) {
      const filePath = path.join(ROOT, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, Buffer.from(data as ArrayBuffer));
      return { key, url: `/uploads/${key}` };
    },
    async putFile(key, source, _contentType) {
      const filePath = path.join(ROOT, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      // Copy rather than rename: the scratch dir may be on another filesystem.
      await copyFile(source, filePath);
      return { key, url: `/uploads/${key}` };
    },
    async delete(key) {
      await rm(path.join(ROOT, key), { force: true });
    },
  };
}
