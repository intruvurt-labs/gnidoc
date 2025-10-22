import { createTRPCRouter } from './create-context';
import hiProcedure from './routes/example/hi/route';
import githubUrlProcedure from './routes/auth/github-url/route';
import githubOAuthProcedure from './routes/auth/github-oauth/route';
import loginProcedure from './routes/auth/login/route';
import signupProcedure from './routes/auth/signup/route';
import meProcedure from './routes/auth/me/route';
import profileProcedure from './routes/auth/profile/route';
import { testConnectionProcedure } from './routes/database/test-connection/route';
import { listTablesProcedure } from './routes/database/list-tables/route';
import { getTableSchemaProcedure } from './routes/database/table-schema/route';
import { executeQueryProcedure } from './routes/database/execute/route';
import createDeployProcedure from './routes/deploy/create/route';
import listDeployProcedure from './routes/deploy/list/route';
import deleteDeployProcedure from './routes/deploy/delete/route';
import seoDeployProcedure from './routes/deploy/seo/route';
import { getFileUrlProcedure } from './routes/files/get-url/route';
import { orchestrateGenerationProcedure } from './routes/orchestration/generate/route';
import { compareModelsProcedure } from './routes/orchestration/compare/route';
import { getModelStatsProcedure } from './routes/orchestration/stats/route';
import { getOrchestrationHistoryProcedure } from './routes/orchestration/history/route';
import orchestrationRunProcedure from './routes/orchestration/run/route';
import orchestrationSingleProcedure from './routes/orchestration/single/route';
import orchestrationProvidersProcedure from './routes/orchestration/providers/route';
import { checkCodeProcedure } from './routes/policy/check-code/route';
import { awardCreditsProcedure } from './routes/policy/award-credits/route';
import { manualFlagProcedure } from './routes/policy/manual-flag/route';
import { createProjectProcedure } from './routes/projects/create/route';
import { exportZipProcedure } from './routes/projects/export-zip/route';
import { gitInitProcedure } from './routes/projects/git-init/route';
import { conductResearchRoute } from './routes/research/conduct/route';
import { deleteResearchRoute } from './routes/research/delete/route';
import { exportResearchRoute } from './routes/research/export/route';
import { researchHistoryRoute } from './routes/research/history/route';

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiProcedure,
  }),
  auth: createTRPCRouter({
    githubUrl: githubUrlProcedure,
    githubOAuth: githubOAuthProcedure,
    login: loginProcedure,
    signup: signupProcedure,
    me: meProcedure,
    profile: profileProcedure,
  }),
  database: createTRPCRouter({
    testConnection: testConnectionProcedure,
    listTables: listTablesProcedure,
    tableSchema: getTableSchemaProcedure,
    execute: executeQueryProcedure,
  }),
  deploy: createTRPCRouter({
    create: createDeployProcedure,
    list: listDeployProcedure,
    delete: deleteDeployProcedure,
    seo: seoDeployProcedure,
  }),
  files: createTRPCRouter({
    getUrl: getFileUrlProcedure,
  }),
  orchestration: createTRPCRouter({
    generate: orchestrateGenerationProcedure,
    history: getOrchestrationHistoryProcedure,
    run: orchestrationRunProcedure,
    single: orchestrationSingleProcedure,
    providers: orchestrationProvidersProcedure,
    compare: compareModelsProcedure,
    stats: getModelStatsProcedure,
  }),
  policy: createTRPCRouter({
    checkCode: checkCodeProcedure,
    awardCredits: awardCreditsProcedure,
    manualFlag: manualFlagProcedure,
  }),
  projects: createTRPCRouter({
    create: createProjectProcedure,
    exportZip: exportZipProcedure,
    gitInit: gitInitProcedure,
  }),
  research: createTRPCRouter({
    conduct: conductResearchRoute,
    delete: deleteResearchRoute,
    export: exportResearchRoute,
    history: researchHistoryRoute,
  }),
});

export type AppRouter = typeof appRouter;
