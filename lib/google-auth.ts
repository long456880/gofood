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
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // Without this Google silently reuses the account the browser is already
      // signed in to. select_account always shows the "choose an account" list.
      queryParams: { prompt: "select_account" },
    },
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
