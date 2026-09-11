/** Compares two secrets without exiting early on the first differing character. */
export function secretsMatch(provided: string, expected: string) {
  const length = Math.max(provided.length, expected.length);
  let mismatch = provided.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (provided.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
