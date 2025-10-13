import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const getFileUrlProcedure = protectedProcedure
  .input(
    z.object({
      fileId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log(`[Files] Getting download URL for file: ${input.fileId}`);
    console.log(`[Files] User: ${ctx.user?.email || 'unknown'}`);

    const mockUrl = `https://example.com/downloads/${input.fileId}.zip`;

    return {
      url: mockUrl,
      fileId: input.fileId,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  });
