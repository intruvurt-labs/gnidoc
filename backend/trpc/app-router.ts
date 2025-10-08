import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import loginRoute from "./routes/auth/login/route";
import signupRoute from "./routes/auth/signup/route";
import profileRoute from "./routes/auth/profile/route";
import meRoute from "./routes/auth/me/route";
import githubOAuthRoute from "./routes/auth/github-oauth/route";
import githubUrlRoute from "./routes/auth/github-url/route";
import conductResearchRoute from "./routes/research/conduct/route";
import researchHistoryRoute from "./routes/research/history/route";
import deleteResearchRoute from "./routes/research/delete/route";
import exportResearchRoute from "./routes/research/export/route";
import createDeploymentRoute from "./routes/deploy/create/route";
import listDeploymentsRoute from "./routes/deploy/list/route";
import deleteDeploymentRoute from "./routes/deploy/delete/route";
import generateSEORoute from "./routes/deploy/seo/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginRoute,
    signup: signupRoute,
    profile: profileRoute,
    me: meRoute,
    githubOAuth: githubOAuthRoute,
    githubUrl: githubUrlRoute,
  }),
  research: createTRPCRouter({
    conduct: conductResearchRoute,
    history: researchHistoryRoute,
    delete: deleteResearchRoute,
    export: exportResearchRoute,
  }),
  deploy: createTRPCRouter({
    create: createDeploymentRoute,
    list: listDeploymentsRoute,
    delete: deleteDeploymentRoute,
    generateSEO: generateSEORoute,
  }),
});

export type AppRouter = typeof appRouter;
