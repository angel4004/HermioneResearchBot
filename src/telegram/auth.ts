import type { Context, MiddlewareFn } from "grammy";

export function isTelegramUserAllowed(userId: number | undefined, allowlist: Set<number>): boolean {
  return userId !== undefined && allowlist.has(userId);
}

export function createAllowlistMiddleware(allowlist: Set<number>): MiddlewareFn<Context> {
  return async (ctx, next) => {
    if (isTelegramUserAllowed(ctx.from?.id, allowlist)) {
      await next();
      return;
    }

    await ctx.reply("Access denied. This HermioneResearchBot instance is allowlist-only.");
  };
}
