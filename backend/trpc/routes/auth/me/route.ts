import { protectedProcedure } from "../../../create-context";

export default protectedProcedure.query(async ({ ctx }) => {
  console.log('[tRPC] Fetching current user');

  return {
    id: `user_${Date.now()}`,
    email: 'user@example.com',
    name: 'Current User',
    provider: 'email' as const,
    createdAt: new Date().toISOString(),
    subscription: 'free' as const,
    credits: 100,
  };
});
