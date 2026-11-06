// Turnstile server check (D-05). Pure: the secret is a parameter, so tests need no env.
// developers.cloudflare.com/turnstile/get-started/server-side-validation/
export async function verifyTurnstile(token: string, ip: string, secret: string): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = (await res.json()) as { success?: boolean; action?: string };
    return j.success === true && j.action === "lead";
  } catch {
    return false; // fail closed, nothing logged
  }
}
