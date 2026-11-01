import { useMemo, useState } from 'react'
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from 'date-fns'
import type { AppointmentWithRelations } from '@/entities/appointment/api/appointment-api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { LoadingSpinner } from '@/shared/ui/states'
import { APPOINTMENT_STATUS_LABELS, MODALITY_LABELS } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import type { AppointmentModality, AppointmentStatus } from '@/shared/types/database'
import {
  type AgendaView,
  filterAppointmentsInRange,
  getMonthGridDays,
  getWeekDays,
  navigateAnchor,
} from '@/features/physio-agenda/model/agenda-utils'
import { AgendaToolbar } from '@/features/physio-agenda/ui/agenda-toolbar'
import { AgendaDayView, AgendaWeekView } from '@/features/physio-agenda/ui/agenda-time-grid'
import { AgendaMonthView } from '@/features/physio-agenda/ui/agenda-month-view'
import { AgendaListTable } from '@/features/physio-agenda/ui/agenda-list-table'
import { AgendaSidePanel } from '@/features/physio-agenda/ui/agenda-side-panel'

export function PhysioAgenda({
  appointments,
  loading,
  physiotherapistId,
}: {
  appointments: AppointmentWithRelations[]
  loading?: boolean
  physiotherapistId: string
}) {
  const [view, setView] = useState<AgendaView>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [modalityFilter, setModalityFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter === 'active') {
        if (a.status === 'cancelled' || a.status === 'no_show') return false
      } else if (statusFilter !== 'all' && a.status !== statusFilter) {
        return false
      }
      if (modalityFilter !== 'all' && a.modality !== modalityFilter) return false
      return true
    })
  }, [appointments, statusFilter, modalityFilter])

  const weekDays = useMemo(() => getWeekDays(anchor), [anchor])
  const monthDays = useMemo(() => getMonthGridDays(anchor), [anchor])

  const listRangeAppointments = useMemo(() => {
    if (view !== 'list') return []
    const start = startOfMonth(anchor)
    const end = endOfMonth(anchor)
    return filterAppointmentsInRange(filtered, startOfDay(start), endOfDay(end))
  }, [filtered, anchor, view])

  const handleSelectDay = (day: Date) => {
    setSelectedDay(day)
    setAnchor(day)
    if (view === 'month') setView('day')
  }

  const handleViewChange = (next: AgendaView) => {
    setView(next)
    if (next === 'day') setAnchor(selectedDay)
  }

  return (
    <div className="space-y-4">
      <AgendaToolbar
        view={view}
        onViewChange={handleViewChange}
        anchor={anchor}
        physiotherapistId={physiotherapistId}
        onToday={() => {
          const now = new Date()
          setAnchor(now)
          setSelectedDay(now)
        }}
        onPrev={() => {
          setAnchor((d) => {
            const next = navigateAnchor(d, view, -1)
            if (view === 'day') setSelectedDay(next)
            return next
          })
        }}
        onNext={() => {
          setAnchor((d) => {
            const next = navigateAnchor(d, view, 1)
            if (view === 'day') setSelectedDay(next)
            return next
          })
        }}
      />

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={pt.agenda.filterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{pt.agenda.filterActive}</SelectItem>
            <SelectItem value="all">{pt.agenda.filterAllStatuses}</SelectItem>
            {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {APPOINTMENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modalityFilter} onValueChange={setModalityFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={pt.agenda.filterModality} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pt.agenda.filterAllModalities}</SelectItem>
            {(Object.keys(MODALITY_LABELS) as AppointmentModality[]).map((modality) => (
              <SelectItem key={modality} value={modality}>
                {MODALITY_LABELS[modality]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner className="mx-auto mt-8 h-8 w-8" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-4">
            {view === 'day' && (
              <AgendaDayView
                day={selectedDay}
                appointments={filtered}
                onSelectDay={handleSelectDay}
              />
            )}
            {view === 'week' && (
              <AgendaWeekView
                days={weekDays}
                appointments={filtered}
                selectedDay={selectedDay}
                onSelectDay={handleSelectDay}
              />
            )}
            {view === 'month' && (
              <AgendaMonthView
                days={monthDays}
                anchor={anchor}
                selectedDay={selectedDay}
                appointments={filtered}
                onSelectDay={handleSelectDay}
              />
            )}
            {view === 'list' && <AgendaListTable appointments={listRangeAppointments} />}
          </div>
          {view !== 'list' && (
            <AgendaSidePanel selectedDay={selectedDay} appointments={filtered} />
          )}
        </div>
      )}
    </div>
  )
}
