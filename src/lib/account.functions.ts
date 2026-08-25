import { supabase } from "@/integrations/supabase/client";

export async function deleteAscendrAccount() {
  const { data, error } = await supabase.functions.invoke("account-delete");
  if (error) throw error;
  return data as { deleted: true };
}
