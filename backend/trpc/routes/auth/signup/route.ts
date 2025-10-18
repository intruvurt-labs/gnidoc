import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";
import { query } from "@/backend/db/pool";

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

      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [emailLower]
      );

      if (existingUser.rows.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists',
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const referralCode = `REF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const result = await query<any>(
        `INSERT INTO users (email, password_hash, name, provider, subscription, credits, referral_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, name, provider, created_at, subscription, credits`,
        [emailLower, passwordHash, input.name, 'email', 'free', 100, referralCode]
      );

      const newUser = result.rows[0];

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
