import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import type { Config } from "@netlify/functions";
import { createApi } from "../lib/core.mjs";
import { makeAssets } from "../lib/assets.mjs";
import seed from "../lib/demo-seed.json";

const assets = makeAssets();

const stores = (name: string) => getStore({ name, consistency: "strong" });

/* Segreto per firmare le sessioni: da variabile d'ambiente LASTELLA_SECRET se presente,
   altrimenti generato al primo avvio e conservato nell'archivio privato (Blobs). */
let cached: string | undefined;
async function getSecret(): Promise<string> {
  if (cached) return cached;
  const env = Netlify.env.get("LASTELLA_SECRET");
  if (env) return (cached = env);
  const meta = stores("meta");
  let s = await meta.get("secret");
  if (!s) {
    await meta.set("secret", randomBytes(48).toString("base64url"), { onlyIfNew: true });
    s = await meta.get("secret");
  }
  return (cached = s as string);
}

export default async (req: Request) => createApi({ secret: await getSecret(), stores, seed, assets })(req);

export const config: Config = {
  path: "/api/*",
  rateLimit: { action: "rate_limit", aggregateBy: ["ip", "domain"], windowSize: 60, windowLimit: 240 },
};
