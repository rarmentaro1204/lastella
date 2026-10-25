import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { createApi } from "../lib/core.mjs";

const secret = Netlify.env.get("LASTELLA_SECRET");

export default async (req: Request) => {
  if (!secret) return Response.json({ error: "Server non configurato (LASTELLA_SECRET mancante)." }, { status: 500 });
  const api = createApi({ secret, stores: (name: string) => getStore({ name, consistency: "strong" }) });
  return api(req);
};

export const config: Config = {
  path: "/api/*",
  rateLimit: { action: "rate_limit", aggregateBy: ["ip", "domain"], windowSize: 60, windowLimit: 240 },
};
