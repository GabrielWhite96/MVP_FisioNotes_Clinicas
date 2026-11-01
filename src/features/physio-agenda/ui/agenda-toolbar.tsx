import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import type { AgendaView } from '@/features/physio-agenda/model/agenda-utils'
import { rangeLabel } from '@/features/physio-agenda/model/agenda-utils'
import { GoogleCalendarConnectButton } from '@/features/physio-agenda/ui/google-calendar-connect'

export function AgendaToolbar({
  view,
  onViewChange,
  anchor,
  onToday,
  onPrev,
  onNext,
  physiotherapistId,
}: {
  view: AgendaView
  onViewChange: (view: AgendaView) => void
  anchor: Date
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  physiotherapistId: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{pt.physio.agenda}</h1>
          <p className="page-kicker">{pt.agenda.subtitle}</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {physiotherapistId ? (
            <GoogleCalendarConnectButton physiotherapistId={physiotherapistId} />
          ) : null}
          <Button asChild>
            <Link to={ROUTES.physio.appointmentNew}>
              <Plus className="mr-2 h-4 w-4" />
              {pt.physio.newAppointment}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            {pt.agenda.today}
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onPrev} aria-label={pt.agenda.previous}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNext} aria-label={pt.agenda.next}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="min-w-[12rem] text-sm font-medium capitalize sm:text-base">
            {rangeLabel(anchor, view)}
          </p>
        </div>

        <Tabs value={view} onValueChange={(v) => onViewChange(v as AgendaView)}>
          <TabsList>
            <TabsTrigger value="day">{pt.agenda.viewDay}</TabsTrigger>
            <TabsTrigger value="week">{pt.agenda.viewWeek}</TabsTrigger>
            <TabsTrigger value="month">{pt.agenda.viewMonth}</TabsTrigger>
            <TabsTrigger value="list">{pt.agenda.viewList}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
