import { corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";
import { UnauthorizedError, createAdminClient, requireUser } from "../_shared/auth.ts";

const PHOTO_BUCKET = "progress-photos";

async function collectStoredFiles(
  bucket: ReturnType<ReturnType<typeof createAdminClient>["storage"]["from"]>,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(prefix, { limit: 100, offset });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      if (item.id) files.push(path);
      else files.push(...(await collectStoredFiles(bucket, path)));
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  return files;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  try {
    const { user } = await requireUser(request);
    const admin = createAdminClient();
    const bucket = admin.storage.from(PHOTO_BUCKET);
    const files = await collectStoredFiles(bucket, user.id);
    for (let index = 0; index < files.length; index += 100) {
      const { error } = await bucket.remove(files.slice(index, index + 100));
      if (error) throw error;
    }
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return jsonResponse({ deleted: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonResponse({ error: error.message }, 401);
    console.error("[account-delete] failed", error);
    return jsonResponse({ error: "Could not delete account" }, 500);
  }
});
