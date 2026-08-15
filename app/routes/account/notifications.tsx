import { NotificationsPage } from "~/features/notifications/components/notifications-page";

export function meta() {
  return [{ title: "Notifications | GraderPlus" }];
}

export default function NotificationsRoute() {
  return <NotificationsPage />;
}
