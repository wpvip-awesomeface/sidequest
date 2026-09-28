import { capsule, endpoint, mutation, query, string, table, text } from "@spacefast/zero/server";

import { handle, requireUser } from "./game.ts";

export default capsule({
  name: "Sidequest",
  favicon: "/assets/favicon.ico",
  schema: {
    saves: table({
      ownerId: string(),
      part: string(),
      data: string(),
    }).index("by_owner", ["ownerId"]),
  },
  queries: {
    me: query(async (ctx) => ({ signedIn: ctx.auth.isAuthenticated && !ctx.auth.isGuest, name: ctx.auth.displayName })),
  },
  mutations: {
    // TEMPORARY: checks whether ctx.ai is live on hosted spaces. Remove after use.
    aiProbe: mutation(async (ctx: any) => {
      requireUser(ctx);
      const out: any = { hasAi: !!ctx.ai, keys: ctx.ai ? Object.keys(ctx.ai) : null, attempts: [] };
      const shapes: any[] = [
        { prompt: "Reply with the single word: ready" },
        { messages: [{ role: "user", content: "Reply with the single word: ready" }] },
      ];
      for (const shape of shapes) {
        try {
          const r = await ctx.ai.complete(shape);
          out.attempts.push({ shape: Object.keys(shape), ok: true, result: JSON.stringify(r).slice(0, 800) });
        } catch (e: any) {
          out.attempts.push({ shape: Object.keys(shape), ok: false, code: e?.code, error: String(e?.message ?? e).slice(0, 400) });
        }
      }
      return out;
    }),
    api: mutation(async (ctx, path: string, body: unknown, offset: number) => handle(ctx, String(path), body, offset)),
  },
  endpoints: {
    health: endpoint({ mode: "read", method: "GET", path: "/api/health" }, () => text("ok")),
  },
});
