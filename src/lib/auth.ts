import { getSupabaseAdmin, hasSupabaseServerConfig } from "@/lib/supabase";

export async function getAuthenticatedEmail(request: Request) {
  if (!hasSupabaseServerConfig()) return null;

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const supabase = getSupabaseAdmin();

  if (!supabase || !token) {
    throw new Error("Authentication required.");
  }

  const { data, error } = await supabase.auth.getUser(token);
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !email) {
    throw new Error("Authentication required.");
  }

  return email;
}
