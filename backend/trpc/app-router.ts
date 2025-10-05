import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import loginRoute from "./routes/auth/login/route";
import signupRoute from "./routes/auth/signup/route";
import profileRoute from "./routes/auth/profile/route";
import meRoute from "./routes/auth/me/route";
import conductResearchRoute from "./routes/research/conduct/route";
import researchHistoryRoute from "./routes/research/history/route";
import deleteResearchRoute from "./routes/research/delete/route";
import exportResearchRoute from "./routes/research/export/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginRoute,
    signup: signupRoute,
    profile: profileRoute,
    me: meRoute,
  }),
  research: createTRPCRouter({
    conduct: conductResearchRoute,
    history: researchHistoryRoute,
    delete: deleteResearchRoute,
    export: exportResearchRoute,
  }),
});

export type AppRouter = typeof appRouter;
