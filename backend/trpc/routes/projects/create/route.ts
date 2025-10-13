import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const createProjectProcedure = protectedProcedure
  .input(
    z.object({
      type: z.enum(["react-native", "web", "api"]),
      name: z.string(),
      slug: z.string(),
      template: z.string(),
      settings: z.any().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    console.log(`[Projects] Creating project: ${input.name} (${input.type})`);
    console.log(`[Projects] Project ID: ${projectId}`);
    console.log(`[Projects] User: ${ctx.user?.email || 'unknown'}`);

    return {
      projectId,
      name: input.name,
      slug: input.slug,
      type: input.type,
      createdAt: new Date().toISOString(),
      message: "Project created successfully",
    };
  });
