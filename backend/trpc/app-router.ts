import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import loginRoute from "./routes/auth/login/route";
import signupRoute from "./routes/auth/signup/route";
import profileRoute from "./routes/auth/profile/route";
import meRoute from "./routes/auth/me/route";

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
});

export type AppRouter = typeof appRouter;
