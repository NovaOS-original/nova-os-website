// Public browser configuration only. The publishable key is designed for frontend use.
// NEVER place a Supabase secret/service_role key or AI provider key in this file.
export const supabaseConfig = {
  url: "REPLACE_WITH_SUPABASE_PROJECT_URL",
  publishableKey: "REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY"
};
export const SUPABASE_CONFIGURED = !Object.values(supabaseConfig).some(v => String(v).startsWith("REPLACE_"));
