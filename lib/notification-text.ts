import { useTranslation } from 'react-i18next';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  params: Record<string, unknown> | null;
  is_read?: boolean;
  created_at: string;
};

// Maps a stored notification to the "notifications_content" key that
// should render its text — some types split by an audience param instead
// of having their own `type`, so the DB `type` alone isn't always enough.
const contentKey = (n: AppNotification): string => {
  if (n.type === 'purchase') return n.params?.audience === 'admin' ? 'purchase_admin' : 'purchase_chef';
  if (n.type === 'report') return n.params?.username ? 'report' : 'report_anonymous';
  if (n.type === 'support') return n.params?.audience === 'admin' ? 'support_admin' : 'support_user';
  return n.type;
};

// Notifications are generated server-side once and stored as plain text —
// `params` lets us re-render that text in whichever language the viewer
// is currently using instead of showing everyone the original English.
// Older rows with no matching key fall back to the stored English text.
export function useNotificationText() {
  const { t, i18n } = useTranslation();

  const localizedTitle = (n: AppNotification): string => {
    const key = `notifications_content.${contentKey(n)}.title`;
    return i18n.exists(key) ? t(key, n.params ?? {}) : n.title;
  };
  const localizedMessage = (n: AppNotification): string => {
    const key = `notifications_content.${contentKey(n)}.message`;
    return i18n.exists(key) ? t(key, n.params ?? {}) : n.message;
  };

  return { localizedTitle, localizedMessage };
}
