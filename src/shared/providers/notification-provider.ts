export interface NotificationPayload {
  title: string
  body: string
  metadata?: Record<string, unknown>
}

export interface NotificationProvider {
  send(userId: string, payload: NotificationPayload): Promise<void>
  subscribe(userId: string, callback: (payload: NotificationPayload) => void): () => void
}

export class InAppNotificationProvider implements NotificationProvider {
  async send(_userId: string, _payload: NotificationPayload): Promise<void> {
    // MVP: notifications stored via DB triggers; push handled in-app via React Query
  }

  subscribe(_userId: string, _callback: (payload: NotificationPayload) => void): () => void {
    return () => {}
  }
}

export const notificationProvider: NotificationProvider = new InAppNotificationProvider()
