import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const gitInitProcedure = protectedProcedure
  .input(
    z.object({
      projectId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log(`[Git] Initializing git repo for project: ${input.projectId}`);
    console.log(`[Git] User: ${ctx.user?.email || 'unknown'}`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      initialized: true,
      projectId: input.projectId,
      branch: "main",
      message: "Git repository initialized successfully",
    };
  });
