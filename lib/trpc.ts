// backend/lib/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import type { createContext } from './context';
// server/trpc.ts
import { initTRPC } from '@trpc/server';
import { createContext } from './context';

const t = initTRPC.context<typeof createContext>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new Error('Unauthorized');
  return next({ ctx: { user: ctx.user } });
});

const t = initTRPC.context<Awaited<ReturnType<typeof createContext>>>().create();

// Main exports
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware for authenticated access
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // narrow type
    },
  });
});

// Usage: for routes that require authentication
export const protectedProcedure = t.procedure.use(isAuthed);
