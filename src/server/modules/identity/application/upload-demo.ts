import { createId } from "@/server/core/ids";
import type { ObjectStorage } from "@/server/core/object-storage";

const MAX_BYTES = 512 * 1024;

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export async function uploadDemo(input: {
  userId: string;
  filename: string;
  contentType: string;
  dataBase64: string;
  storage: ObjectStorage;
}) {
  const buffer = Buffer.from(input.dataBase64, "base64");
  if (buffer.byteLength === 0) {
    throw new Error("Empty file");
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("File is too large (max 512KB)");
  }

  const key = `identity/demo/${input.userId}/${createId()}-${sanitizeFilename(input.filename)}`;
  await input.storage.put({
    key,
    body: new Uint8Array(buffer),
    contentType: input.contentType || "application/octet-stream",
  });
  const url = await input.storage.url(key);
  return { key, url, size: buffer.byteLength };
}
