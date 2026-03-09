// Mock Supabase client for preview environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mock.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "mock-key";

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: "mock-user", email: "user@example.com" } } }, error: null }),
    onAuthStateChange: (callback: any) => {
      // Immediately trigger with a mock session
      callback('SIGNED_IN', { user: { id: "mock-user", email: "user@example.com" } });
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signOut: async () => ({ error: null }),
  },
  from: () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      gte: () => chain,
      lte: () => chain,
      order: () => chain,
      update: () => chain,
      insert: () => Promise.resolve({ data: [], error: null }),
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return chain;
  },
  channel: () => ({
    on: () => ({
      subscribe: () => ({}),
    }),
  }),
  removeChannel: () => {},
} as any;

