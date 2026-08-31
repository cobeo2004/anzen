import type { ObjectStorage } from "@/server/core/object-storage";

function displayName(key: string) {
  const base = key.split("/").at(-1) ?? key;
  return base.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    "",
  );
}

export async function listUploads(input: {
  userId: string;
  storage: ObjectStorage;
}) {
  const prefix = `identity/demo/${input.userId}`;
  const items = await input.storage.list(prefix);
  return Promise.all(
    items.map(async (item) => ({
      key: item.key,
      filename: displayName(item.key),
      contentType: item.contentType ?? "application/octet-stream",
      updatedAt: item.updatedAt ?? null,
      url: await input.storage.url(item.key),
    })),
  );
}
