import crypto from "node:crypto";

export function createRunHash(input: string) {
  const rnd = crypto.randomBytes(16).toString("hex");
  const now = Date.now().toString(16);
  const h = crypto.createHash("sha256").update(`${now}:${input}:${rnd}`).digest("hex");
  return h.slice(0, 12);
}

