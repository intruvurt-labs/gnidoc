import { z } from "zod";
import { publicProcedure } from "../../../create-context";

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

    const mockUser = {
      id: `user_${Date.now()}`,
      email: input.email,
      name: input.name,
      provider: 'email' as const,
      createdAt: new Date().toISOString(),
      subscription: 'free' as const,
      credits: 100,
    };

    const mockToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      user: mockUser,
      token: mockToken,
    };
  });
