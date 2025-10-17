import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { checkRateLimit } from "../lib/rate-limit";
import jwt from 'jsonwebtoken';
import { ENV } from '../lib/env';

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  let userId: string | undefined;
  if (token) {
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      console.error('[Context] JWT verification failed:', error);
    }
  }

  return {
    req: opts.req,
    token,
    userId,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      token: ctx.token,
      userId: ctx.userId,
    },
  });
});

const rateLimited = t.middleware(async ({ ctx, next, path }) => {
  const ip = ctx.req.headers.get('x-forwarded-for') || 
             ctx.req.headers.get('x-real-ip') || 
             'unknown';
  
  const identifier = ctx.userId || ip;
  const { success, remaining } = await checkRateLimit(identifier);
  
  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }
  
  return next();
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure.use(rateLimited);
export const protectedProcedure = t.procedure.use(rateLimited).use(isAuthenticated);
