import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export default protectedProcedure
  .input(
    z.object({
      name: z.string().optional(),
      avatar: z.string().optional(),
      bio: z.string().optional(),
      company: z.string().optional(),
      location: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[tRPC] Profile update:', input);

    return {
      success: true,
      message: 'Profile updated successfully',
      updates: input,
    };
  });
