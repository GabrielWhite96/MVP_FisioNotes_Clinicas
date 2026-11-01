export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
}

export function validateEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    console.warn(
      'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    )
  }
}
