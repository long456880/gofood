import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type AuthChangeEvent, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

// AsyncStorage's web fallback reads window.localStorage with no guard, which
// crashes when this module is evaluated during SSR (expo web "output": "server").
// `window` never exists in that server process, so this stays a safe permanent no-op there.
const SSRSafeStorage = {
  getItem: (key: string) => (typeof window === "undefined" ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) =>
    typeof window === "undefined" ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) =>
    typeof window === "undefined" ? Promise.resolve() : AsyncStorage.removeItem(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: SSRSafeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [event, setEvent] = useState<AuthChangeEvent | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsPending(false);
    });

    // Verifying a password-reset code signs the user in with a real session,
    // but tagged with a PASSWORD_RECOVERY event instead of SIGNED_IN — that
    // distinction is what lets the app show the "set new password" screen
    // instead of dropping a mid-recovery user straight into the app.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setEvent(event);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { data: session, event, isPending };
}
