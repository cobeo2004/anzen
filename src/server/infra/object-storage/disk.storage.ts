import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type {
  ListedObject,
  ObjectStorage,
  StoredObject,
} from "@/server/core/object-storage";

function assertSafeKey(key: string) {
  if (
    key.length === 0 ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").some((part) => part === ".." || part === "")
  ) {
    throw new Error("Invalid object storage key");
  }
}

export class DiskObjectStorage implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  private resolve(key: string): string {
    assertSafeKey(key);
    const full = path.resolve(this.rootDir, key);
    const root = path.resolve(this.rootDir);
    if (!full.startsWith(`${root}${path.sep}`) && full !== root) {
      throw new Error("Invalid object storage key");
    }
    return full;
  }

  async put(input: {
    key: string;
    body: Uint8Array;
    contentType?: string;
  }): Promise<{ key: string }> {
    const full = this.resolve(input.key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, input.body);
    if (input.contentType) {
      await writeFile(
        `${full}.meta.json`,
        JSON.stringify({ contentType: input.contentType }),
      );
    }
    return { key: input.key };
  }

  async get(key: string): Promise<StoredObject | null> {
    const full = this.resolve(key);
    try {
      const body = await readFile(full);
      let contentType: string | undefined;
      try {
        const meta = JSON.parse(
          await readFile(`${full}.meta.json`, "utf8"),
        ) as { contentType?: string };
        contentType = meta.contentType;
      } catch {
        contentType = undefined;
      }
      return { body: new Uint8Array(body), contentType };
    } catch {
      return null;
    }
  }

  async list(prefix: string): Promise<ListedObject[]> {
    const dir = this.resolve(prefix);
    let dirents: import("node:fs").Dirent[];
    try {
      dirents = await readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }

    const items: ListedObject[] = [];
    for (const dirent of dirents) {
      if (!dirent.isFile() || dirent.name.endsWith(".meta.json")) {
        continue;
      }
      const key = `${prefix}/${dirent.name}`;
      const full = path.join(dir, dirent.name);
      const fileStat = await stat(full);
      let contentType: string | undefined;
      try {
        const meta = JSON.parse(
          await readFile(`${full}.meta.json`, "utf8"),
        ) as {
          contentType?: string;
        };
        contentType = meta.contentType;
      } catch {
        contentType = undefined;
      }
      items.push({
        key,
        contentType,
        updatedAt: fileStat.mtime.toISOString(),
      });
    }

    items.sort((left, right) =>
      (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""),
    );
    return items;
  }

  async delete(key: string): Promise<void> {
    const full = this.resolve(key);
    await rm(full, { force: true });
    await rm(`${full}.meta.json`, { force: true });
  }

  async url(key: string): Promise<string> {
    assertSafeKey(key);
    return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}
