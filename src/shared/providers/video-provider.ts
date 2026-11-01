export interface VideoJoinResult {
  provider: 'daily' | 'mock'
  roomUrl: string | null
  token?: string | null
}

export interface VideoProvider {
  joinRoom(appointmentId: string): Promise<VideoJoinResult>
  leaveRoom(): Promise<void> | void
  isConnected(): boolean
  getRoomUrl?(): string | null
  setAudioEnabled?(enabled: boolean): void
  setVideoEnabled?(enabled: boolean): void
  getAudioEnabled?(): boolean
  getVideoEnabled?(): boolean
}

export class MockVideoProvider implements VideoProvider {
  private connected = false
  private currentRoom: string | null = null
  private audioEnabled = true
  private videoEnabled = true

  async joinRoom(appointmentId: string): Promise<VideoJoinResult> {
    this.currentRoom = appointmentId
    this.connected = true
    this.audioEnabled = true
    this.videoEnabled = true
    return { provider: 'mock', roomUrl: null }
  }

  leaveRoom(): void {
    this.connected = false
    this.currentRoom = null
  }

  isConnected(): boolean {
    return this.connected
  }

  getRoomUrl(): string | null {
    return this.currentRoom
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled
  }

  setVideoEnabled(enabled: boolean): void {
    this.videoEnabled = enabled
  }

  getAudioEnabled(): boolean {
    return this.audioEnabled
  }

  getVideoEnabled(): boolean {
    return this.videoEnabled
  }
}

export class DailyVideoProvider implements VideoProvider {
  private connected = false
  private roomUrl: string | null = null
  private appointmentId: string | null = null
  private audioEnabled = true
  private videoEnabled = true
  private fallback = new MockVideoProvider()

  async joinRoom(appointmentId: string): Promise<VideoJoinResult> {
    this.appointmentId = appointmentId
    try {
      const { supabase } = await import('@/shared/api/supabase')
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: { appointmentId },
      })
      if (error) throw error
      const payload = data as VideoJoinResult | null
      if (payload?.provider === 'daily' && payload.roomUrl) {
        this.connected = true
        this.audioEnabled = true
        this.videoEnabled = true
        const base = payload.roomUrl
        // Daily prejoin URL: append media prefs when toggling via iframe reload
        this.roomUrl = payload.token
          ? `${base}?t=${payload.token}`
          : base
        return { ...payload, roomUrl: this.buildEmbedUrl() }
      }
    } catch {
      // Fall back to mock when Daily is not configured.
    }
    const result = await this.fallback.joinRoom(appointmentId)
    this.connected = true
    this.roomUrl = null
    return result
  }

  private buildEmbedUrl(): string | null {
    if (!this.roomUrl) return null
    const url = new URL(this.roomUrl)
    url.searchParams.set('startAudioOff', this.audioEnabled ? 'false' : 'true')
    url.searchParams.set('startVideoOff', this.videoEnabled ? 'false' : 'true')
    return url.toString()
  }

  async leaveRoom(): Promise<void> {
    if (this.appointmentId) {
      try {
        const { endTelehealthSession } = await import(
          '@/entities/telehealth/api/telehealth-api'
        )
        await endTelehealthSession(this.appointmentId)
      } catch {
        // Non-blocking: session end is best-effort.
      }
    }
    this.connected = false
    this.roomUrl = null
    this.appointmentId = null
    this.fallback.leaveRoom()
  }

  isConnected(): boolean {
    return this.connected
  }

  getRoomUrl(): string | null {
    return this.buildEmbedUrl()
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled
    this.fallback.setAudioEnabled?.(enabled)
  }

  setVideoEnabled(enabled: boolean): void {
    this.videoEnabled = enabled
    this.fallback.setVideoEnabled?.(enabled)
  }

  getAudioEnabled(): boolean {
    return this.audioEnabled
  }

  getVideoEnabled(): boolean {
    return this.videoEnabled
  }
}

export const videoProvider: VideoProvider = new DailyVideoProvider()
