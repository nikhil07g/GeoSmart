import { api } from "@/api/api";
export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  type: string;
}
export async function listNotifications() {
  return api<NotificationDto[]>("/notifications");
}
export async function markNotificationRead(id: string) {
  return api(`/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) });
}
