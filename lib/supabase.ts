// This is a simplified mock implementation for preview mode
const mockSupabaseClient = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    }),
    signUp: () => Promise.resolve({ data: {}, error: null }),
    signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
  }),
}

// Export the mock client directly to avoid any initialization errors
export const supabase = mockSupabaseClient

export type UserProfile = {
  id: string
  email: string
  username: string
  created_at: string
  last_login: string
  favorites: string[] // Array of movie IDs
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // Return a mock profile for preview mode
  return {
    id: userId,
    email: "user@example.com",
    username: "Preview User",
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    favorites: ["1", "2", "3", "4", "5"],
  }
}

export async function createUserProfile(userId: string, email: string, username: string): Promise<UserProfile | null> {
  // Return a mock profile for preview mode
  return {
    id: userId,
    email,
    username,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    favorites: [],
  }
}

export async function updateLastLogin(userId: string): Promise<void> {
  // No-op in preview mode
  return
}

export async function toggleFavoriteMovie(userId: string, movieId: string): Promise<string[] | null> {
  // Return mock favorites for preview mode
  return ["1", "2", "3", "4", "5"]
}
