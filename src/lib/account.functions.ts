import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PHOTO_BUCKET = "progress-photos";

interface StorageBucket {
  list: (
    prefix: string,
    options: { limit: number; offset: number },
  ) => Promise<{
    data: Array<{ id?: string | null; name: string }> | null;
    error: { message: string } | null;
  }>;
}

async function collectStoredFiles(bucket: StorageBucket, prefix: string): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(prefix, { limit: 100, offset });
    if (error) throw new Error(error.message);
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

export const deleteAscendrAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Account deletion is not configured on this server.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from(PHOTO_BUCKET);
    const storedFiles = await collectStoredFiles(bucket, context.userId);

    for (let offset = 0; offset < storedFiles.length; offset += 100) {
      const { error } = await bucket.remove(storedFiles.slice(offset, offset + 100));
      if (error) throw new Error(error.message);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);

    return { deleted: true } as const;
  });
