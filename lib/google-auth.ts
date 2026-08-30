import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo = makeRedirectUri();
  console.log("[google-auth] redirectTo:", redirectTo);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error };

  const res = await WebBrowser.openAuthSessionAsync(data.url ?? "", redirectTo);
  if (res.type !== "success") return { error: null };

  const { params, errorCode } = QueryParams.getQueryParams(res.url);
  if (errorCode) return { error: { message: errorCode } };
  if (!params.access_token) return { error: null };

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  return { error: sessionError };
}
