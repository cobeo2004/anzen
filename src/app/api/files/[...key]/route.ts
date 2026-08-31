import { headers } from "next/headers";
import { getAuth } from "@/server/infra/auth/auth";
import { getObjectStorage } from "@/server/infra/object-storage/object-storage.factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key: keyParts } = await context.params;
  const key = keyParts.map(decodeURIComponent).join("/");
  const stored = await getObjectStorage().get(key);
  if (!stored) {
    return new Response("Not found", { status: 404 });
  }

  const filename = key.split("/").at(-1) ?? "file";
  return new Response(Buffer.from(stored.body), {
    headers: {
      "Content-Type": stored.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
