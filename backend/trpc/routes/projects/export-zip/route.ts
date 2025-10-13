import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const exportZipProcedure = protectedProcedure
  .input(
    z.object({
      projectId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log(`[Export] Generating ZIP export for project: ${input.projectId}`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const mockUrl = `https://example.com/downloads/${fileId}.zip`;

    return {
      fileId,
      url: mockUrl,
      projectId: input.projectId,
      message: "Export ready for download",
    };
  });
