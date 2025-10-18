import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";
import { query } from "@/backend/db/pool";

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aurebix-secret-key-change-in-production';

interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  provider: string;
  created_at: string;
  subscription: string;
  credits: number;
}

export default publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })
  )
  .mutation(async ({ input }) => {
    console.log('[tRPC] Login attempt:', input.email);

    try {
      const result = await query<User>(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        [input.email.toLowerCase()]
      );

      const user = result.rows[0];

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      await query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password_hash, ...userWithoutPassword } = user;

      return {
        success: true,
        user: {
          id: userWithoutPassword.id,
          email: userWithoutPassword.email,
          name: userWithoutPassword.name,
          provider: userWithoutPassword.provider as 'email',
          createdAt: userWithoutPassword.created_at,
          subscription: userWithoutPassword.subscription as 'free' | 'basic' | 'pro' | 'enterprise',
          credits: userWithoutPassword.credits,
        },
        token,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('[tRPC] Login error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during login',
      });
    }
  });


