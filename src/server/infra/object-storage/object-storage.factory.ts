import { getAppEnv } from "@/server/config/env";
import type { ObjectStorage } from "@/server/core/object-storage";
import { DiskObjectStorage } from "./disk.storage";
import { S3ObjectStorage } from "./s3.storage";

const globalForStorage = globalThis as unknown as {
  storage?: ObjectStorage;
};

export function getObjectStorage(): ObjectStorage {
  if (globalForStorage.storage) {
    return globalForStorage.storage;
  }

  const { storageProvider, storageLocalDir, s3 } = getAppEnv();
  const storage =
    storageProvider === "s3"
      ? createS3Storage(s3)
      : new DiskObjectStorage(storageLocalDir);

  globalForStorage.storage = storage;
  return storage;
}

function createS3Storage(s3: ReturnType<typeof getAppEnv>["s3"]) {
  if (!s3.accessKey || !s3.secretKey) {
    throw new Error(
      "STORAGE_PROVIDER=s3 requires S3_ACCESS_KEY and S3_SECRET_KEY",
    );
  }

  return new S3ObjectStorage({
    endpoint: s3.endpoint,
    region: s3.region,
    accessKey: s3.accessKey,
    secretKey: s3.secretKey,
    bucket: s3.bucket,
    forcePathStyle: s3.forcePathStyle,
  });
}
