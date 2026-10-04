import type { Pool, PoolClient } from "pg";

type Notifiable = Pick<Pool | PoolClient, "query">;

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

type NotifyTarget =
  | { type: "all" }
  | { type: "user"; userId: string }
  | { type: "email"; email: string };

type NotificationContent = {
  type: string;
  title: string;
  message: string;
  link: string;
  // Drives the in-app translation for this notification (see
  // lib/i18n/*.json "notifications_content"). `title`/`message` above stay
  // as the English fallback for viewers whose language the client can't
  // resolve a translation key for.
  params?: Record<string, unknown>;
};

// Inserts a notification for every opted-in recipient matching `target`.
// Silently no-ops for recipients with notifications_enabled = false.
export async function notifyOptedIn(
  client: Notifiable,
  target: NotifyTarget,
  { type, title, message, link, params = {} }: NotificationContent
) {
  const paramsJson = JSON.stringify(params);
  if (target.type === "all") {
    // "All" is the customer-facing audience (e.g. "new recipe added"). The
    // admin runs the platform and gets its own review/report notifications
    // instead, so it's left out of broadcasts.
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, params)
       SELECT p.id, $1, $2, $3, $4, $5
       FROM profiles p
       WHERE p.notifications_enabled = true
         AND NOT EXISTS (
           SELECT 1 FROM auth.users u WHERE u.id::text = p.id AND u.email = $6
         )`,
      [type, title, message, link, paramsJson, ADMIN_EMAIL]
    );
  } else if (target.type === "user") {
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, params)
       SELECT id, $1, $2, $3, $4, $5
       FROM profiles WHERE id = $6 AND notifications_enabled = true`,
      [type, title, message, link, paramsJson, target.userId]
    );
  } else {
    // profiles.id is text while auth.users.id is uuid — Postgres won't
    // compare the two without an explicit cast.
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, link, params)
       SELECT p.id, $1, $2, $3, $4, $5
       FROM profiles p
       JOIN auth.users u ON u.id::text = p.id
       WHERE u.email = $6 AND p.notifications_enabled = true`,
      [type, title, message, link, paramsJson, target.email]
    );
  }
}
