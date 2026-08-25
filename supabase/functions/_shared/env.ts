export function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required Edge Function secret: ${name}`);
  return value;
}

export function optionalEnv(name: string) {
  return Deno.env.get(name)?.trim() || undefined;
}
