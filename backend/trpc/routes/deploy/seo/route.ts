import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';

export const generateSEOProcedure = publicProcedure
  .input(
    z.object({
      projectName: z.string(),
      projectDescription: z.string(),
      features: z.array(z.string()),
      targetAudience: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { projectName, projectDescription, features, targetAudience } = input;

    console.log(`[Deploy API] Generating SEO content for: ${projectName}`);

    const seoContent = {
      title: `${projectName} - ${projectDescription.substring(0, 40)}`,
      description: projectDescription.substring(0, 160),
      keywords: [...features, projectName.toLowerCase(), 'web app', 'saas'],
      ogImage: `https://gnidoc.app/og/${projectName.toLowerCase().replace(/\s+/g, '-')}.png`,
      videoScript: `
🎬 YouTube Video Script - ${projectName} Launch

[INTRO - 0:00-0:15]
"Hey everyone! Today I'm excited to introduce ${projectName} - ${projectDescription}"

[PROBLEM - 0:15-0:45]
"Have you ever struggled with [problem]? ${projectName} solves this by..."

[FEATURES - 0:45-1:30]
${features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

[DEMO - 1:30-2:15]
"Let me show you how easy it is to use..."

[CALL TO ACTION - 2:15-2:30]
"Try ${projectName} today at [your-url]. Link in description!"

[OUTRO - 2:30-2:45]
"Thanks for watching! Subscribe for more app launches and tech reviews!"

---
TAGS: ${features.join(', ')}, web app, saas, productivity
THUMBNAIL: Bold text "${projectName}" with app screenshot
      `.trim(),
    };

    console.log(`[Deploy API] SEO content generated successfully`);

    return seoContent;
  });

export default generateSEOProcedure;
