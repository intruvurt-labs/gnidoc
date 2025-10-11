import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";
import { users } from "../login/route";

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aurebix-secret-key-change-in-production';

export default publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(2),
    })
  )
  .mutation(async ({ input }) => {
    console.log('[tRPC] Signup attempt:', input.email);

    try {
      const emailLower = input.email.toLowerCase();

      if (users.has(emailLower)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists',
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: emailLower,
        password_hash: passwordHash,
        name: input.name,
        provider: 'email',
        created_at: new Date().toISOString(),
        subscription: 'free',
        credits: 100,
      };

      users.set(emailLower, newUser);

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('[tRPC] User registered successfully:', emailLower);

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          provider: newUser.provider as 'email',
          createdAt: newUser.created_at,
          subscription: newUser.subscription as 'free' | 'basic' | 'pro' | 'enterprise',
          credits: newUser.credits,
        },
        token,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('[tRPC] Signup error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during signup',
      });
    }
  });
