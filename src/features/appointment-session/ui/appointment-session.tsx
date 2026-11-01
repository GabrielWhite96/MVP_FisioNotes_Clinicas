import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import { videoProvider } from '@/shared/providers'
import { updateAppointmentStatus } from '@/entities/appointment/api/appointment-api'
import { getTelehealthSession } from '@/entities/telehealth/api/telehealth-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { MODALITY_LABELS, APPOINTMENT_STATUS_LABELS, ROUTES } from '@/shared/config/routes'
import { formatDateTime } from '@/shared/lib/dates'
import { pt } from '@/shared/config/i18n/pt'
import type { AppointmentModality, AppointmentStatus } from '@/shared/types/database'
import { useNavigate } from 'react-router-dom'
import { RescheduleDialog } from '@/features/scheduling/ui/reschedule-dialog'
import { CancelDialog } from '@/features/scheduling/ui/cancel-dialog'

interface AppointmentSessionProps {
  appointment: {
    id: string
    patient_id?: string
    modality: AppointmentModality
    status: AppointmentStatus
    scheduled_at: string
    home_address: string | null
    notes: string | null
    price_cents?: number | null
    patient?: { profiles?: { full_name: string } | null; address_line1?: string | null; city?: string | null; province?: string | null } | null
    physiotherapist?: { profiles?: { full_name: string } | null } | null
  }
  role: 'patient' | 'physiotherapist'
}

export function AppointmentSession({ appointment, role }: AppointmentSessionProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [provider, setProvider] = useState<'daily' | 'mock' | null>(null)
  const [joining, setJoining] = useState(false)
  const canJoin = appointment.modality === 'telehealth'
    && ['scheduled', 'confirmed'].includes(appointment.status)

  const sessionQuery = useQuery({
    queryKey: queryKeys.telehealthSession(appointment.id),
    queryFn: () => getTelehealthSession(appointment.id),
    enabled: appointment.modality === 'telehealth',
  })

  useEffect(() => {
    if (appointment.modality !== 'telehealth' || role === 'patient') return
    let cancelled = false
    videoProvider.joinRoom(appointment.id).then((result) => {
      if (cancelled) return
      setConnected(true)
      setProvider(result.provider)
      setRoomUrl(result.roomUrl)
      queryClient.invalidateQueries({ queryKey: queryKeys.telehealthSession(appointment.id) })
    })
    return () => {
      cancelled = true
      void videoProvider.leaveRoom()
    }
  }, [appointment.id, appointment.modality, queryClient, role])

  useEffect(() => {
    if (role !== 'patient' || !connected) return
    return () => {
      void videoProvider.leaveRoom()
    }
  }, [connected, role])

  const enterRoom = async () => {
    setJoining(true)
    try {
      const result = await videoProvider.joinRoom(appointment.id)
      setConnected(true)
      setProvider(result.provider)
      setRoomUrl(result.roomUrl)
      queryClient.invalidateQueries({ queryKey: queryKeys.telehealthSession(appointment.id) })
    } finally {
      setJoining(false)
    }
  }

  const statusMutation = useMutation({
    mutationFn: (status: AppointmentStatus) => updateAppointmentStatus(appointment.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointment(appointment.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() })
      if (appointment.patient_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.patientBilling(appointment.patient_id) })
      }
      queryClient.invalidateQueries({ queryKey: ['physio-billing-overview'] })
      const base = role === 'patient' ? ROUTES.patient.dashboard : ROUTES.physio.dashboard
      navigate(base)
    },
  })

  const toggleMic = () => {
    const next = !micOn
    setMicOn(next)
    videoProvider.setAudioEnabled?.(next)
    if (provider === 'daily') {
      setRoomUrl(videoProvider.getRoomUrl?.() ?? roomUrl)
    }
  }

  const toggleCam = () => {
    const next = !camOn
    setCamOn(next)
    videoProvider.setVideoEnabled?.(next)
    if (provider === 'daily') {
      setRoomUrl(videoProvider.getRoomUrl?.() ?? roomUrl)
    }
  }

  const hangUp = async () => {
    await videoProvider.leaveRoom()
    setConnected(false)
    setRoomUrl(null)
    queryClient.invalidateQueries({ queryKey: queryKeys.telehealthSession(appointment.id) })
  }

  const patientName = appointment.patient?.profiles?.full_name ?? 'Paciente'
  const physioName = appointment.physiotherapist?.profiles?.full_name ?? 'Fisioterapeuta'
  const sessionStatus = sessionQuery.data?.status

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Consulta</h1>
          <p className="text-[var(--color-muted-foreground)]">{formatDateTime(appointment.scheduled_at)}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{MODALITY_LABELS[appointment.modality]}</Badge>
          <Badge variant="secondary">{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
          {sessionStatus && <Badge variant="outline">Sessão: {sessionStatus}</Badge>}
        </div>
      </div>

      {appointment.modality === 'telehealth' ? (
        <Card>
          <CardHeader>
            <CardTitle>{pt.appointment.telehealth}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-900 text-white">
              {role === 'patient' && !connected ? (
                <div className="space-y-3 px-6 text-center">
                  <p className="text-sm opacity-80">{physioName}</p>
                  {canJoin ? (
                    <Button onClick={() => void enterRoom()} disabled={joining}>
                      {joining ? pt.common.loading : pt.appointment.join}
                    </Button>
                  ) : (
                    <p className="text-sm opacity-75">{APPOINTMENT_STATUS_LABELS[appointment.status]}</p>
                  )}
                </div>
              ) : roomUrl ? (
                <iframe
                  key={roomUrl}
                  title="Teleconsulta Daily"
                  src={roomUrl}
                  allow="camera; microphone; fullscreen; speaker; display-capture"
                  className="h-full w-full border-0"
                />
              ) : connected ? (
                <div className="text-center">
                  <Video className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2 text-sm opacity-75">
                    {role === 'patient'
                      ? pt.appointment.roomUnavailable
                      : 'Sala de vídeo pronta. Configure DAILY_API_KEY para ativar Daily.'}
                  </p>
                  {role === 'physiotherapist' && (
                    <p className="mt-1 text-xs opacity-50">
                      Mic: {micOn ? 'ligado' : 'desligado'} · Câmera: {camOn ? 'ligada' : 'desligada'}
                    </p>
                  )}
                </div>
              ) : (
                <p>Conectando...</p>
              )}
            </div>
            {(role !== 'patient' || connected) && (
              <div className="flex justify-center gap-2">
                <Button variant={micOn ? 'secondary' : 'destructive'} size="icon" onClick={toggleMic}>
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button variant={camOn ? 'secondary' : 'destructive'} size="icon" onClick={toggleCam}>
                  {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button variant="destructive" size="icon" onClick={() => void hangUp()}>
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-center text-sm text-[var(--color-muted-foreground)]">
              {role === 'patient' ? physioName : patientName}
              {role !== 'patient' && (provider === 'daily' ? ' · Daily' : provider === 'mock' ? ' · Mock' : '')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{pt.appointment.homeVisit}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {role === 'patient' ? (
              <div>
                <p className="text-sm font-medium">{pt.appointment.yourPhysioComes}</p>
                <p>{physioName}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">Paciente</p>
                <p>{patientName}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{pt.appointment.address}</p>
              <p>
                {appointment.home_address ??
                  [appointment.patient?.address_line1, appointment.patient?.city, appointment.patient?.province]
                    .filter(Boolean)
                    .join(', ') ??
                  'Endereço não informado'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">{pt.appointment.when}</p>
              <p>{formatDateTime(appointment.scheduled_at)}</p>
            </div>
            {appointment.notes && (
              <div>
                <p className="text-sm font-medium">Observações</p>
                <p className="text-[var(--color-muted-foreground)]">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {role === 'physiotherapist' && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
        <div className="flex flex-wrap gap-2">
          {appointment.status === 'scheduled' && (
            <Button onClick={() => statusMutation.mutate('confirmed')}>Confirmar</Button>
          )}
          <Button onClick={() => statusMutation.mutate('completed')}>{pt.appointment.complete}</Button>
          <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
            {pt.appointment.reschedule}
          </Button>
          <Button variant="outline" onClick={() => statusMutation.mutate('no_show')}>
            {pt.appointment.noShow}
          </Button>
        </div>
      )}

      {role === 'patient' && ['scheduled', 'confirmed'].includes(appointment.status) && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
            {pt.appointment.reschedule}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setCancelOpen(true)}
          >
            {pt.appointment.cancel}
          </Button>
        </div>
      )}

      <RescheduleDialog
        appointmentId={appointment.id}
        currentScheduledAt={appointment.scheduled_at}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
      />
      <CancelDialog
        appointmentId={appointment.id}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onCancelled={() => navigate(role === 'patient' ? ROUTES.patient.dashboard : ROUTES.physio.dashboard)}
      />
    </div>
  )
}
