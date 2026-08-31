import { getAppEnv } from "@/server/config/env";
import type { ObjectStorage } from "@/server/core/object-storage";
import { DiskObjectStorage } from "./disk.storage";

export function getObjectStorage(): ObjectStorage {
  const { storageProvider, storageLocalDir } = getAppEnv();
  if (storageProvider === "s3") {
    throw new Error(
      "STORAGE_PROVIDER=s3 is not implemented yet. Use disk for now.",
    );
  }

  return new DiskObjectStorage(storageLocalDir);
}
