import "server-only";

// Read on use, never at module load: Worker secrets reach process.env on the first request (research Pattern 3).
// The error names the variable only, never a value.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
