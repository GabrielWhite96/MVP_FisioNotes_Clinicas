import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getAdminStats, getAdminUsers, getAdminAppointments, getAuditLogs, promoteUserRole } from '@/entities/notification/api/notification-api'
import { getAdminPhysioSubscriptions, setPhysioSubscriptionStatus } from '@/entities/physiotherapist/api/saas-checkout-api'
import { Button } from '@/shared/ui/button'
import { queryKeys } from '@/shared/api/query-keys'
import { StatCard } from '@/widgets/dashboard/dashboard-widgets'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import { pt } from '@/shared/config/i18n/pt'
import { APPOINTMENT_STATUS_LABELS, MODALITY_LABELS } from '@/shared/config/routes'
import { formatDateTime } from '@/shared/lib/dates'

export function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: getAdminStats,
  })

  const chartData = statsQuery.data
    ? [
        { name: 'Pacientes', value: statsQuery.data.patients },
        { name: 'Fisioterapeutas', value: statsQuery.data.physiotherapists },
        { name: 'Realizadas', value: statsQuery.data.completedAppointments },
        { name: 'Futuras', value: statsQuery.data.upcomingAppointments },
        { name: 'Canceladas', value: statsQuery.data.cancelledAppointments },
      ]
    : []

  return (
    
      <div className="space-y-6">
        <h1 className="page-title">{pt.admin.dashboard}</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title={pt.admin.stats.patients} value={statsQuery.data?.patients ?? 0} loading={statsQuery.isLoading} />
          <StatCard title={pt.admin.stats.physiotherapists} value={statsQuery.data?.physiotherapists ?? 0} loading={statsQuery.isLoading} />
          <StatCard title={pt.admin.stats.completed} value={statsQuery.data?.completedAppointments ?? 0} loading={statsQuery.isLoading} />
          <StatCard title={pt.admin.stats.upcoming} value={statsQuery.data?.upcomingAppointments ?? 0} loading={statsQuery.isLoading} />
          <StatCard title={pt.admin.stats.cancelled} value={statsQuery.data?.cancelledAppointments ?? 0} loading={statsQuery.isLoading} />
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Visão geral</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1aa7a1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    
  )
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: getAdminUsers,
  })

  const promote = useMutation({
    mutationFn: (userId: string) => promoteUserRole(userId, 'admin'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })

  const subscriptionsQuery = useQuery({
    queryKey: ['admin-physio-subscriptions'],
    queryFn: getAdminPhysioSubscriptions,
  })

  const setSubscription = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      setPhysioSubscriptionStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-physio-subscriptions'] }),
  })

  const subscriptionLabel = {
    trialing: pt.saas.trialing,
    active: pt.saas.active,
    inactive: pt.saas.inactive,
  } as const

  const physioName = (profiles: { full_name: string } | { full_name: string }[] | null) => {
    if (!profiles) return '—'
    return Array.isArray(profiles) ? profiles[0]?.full_name ?? '—' : profiles.full_name
  }

  const roleLabels: Record<string, string> = {
    patient: 'Paciente',
    physiotherapist: 'Fisioterapeuta',
    admin: 'Administrador',
    caregiver: 'Cuidador',
  }

  return (
    
      <div className="space-y-6">
        <h1 className="page-title">{pt.admin.users}</h1>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell><Badge variant="secondary">{roleLabels[u.role]}</Badge></TableCell>
                    <TableCell>{u.phone ?? '—'}</TableCell>
                    <TableCell>{formatDateTime(u.created_at)}</TableCell>
                    <TableCell>
                      {u.role !== 'admin' && (
                        <Button size="sm" variant="outline" onClick={() => promote.mutate(u.id)} disabled={promote.isPending}>
                          Promover a admin
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{pt.saas.status}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>{pt.saas.status}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionsQuery.data?.map((physio) => (
                  <TableRow key={physio.id}>
                    <TableCell className="font-medium">{physioName(physio.profiles)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{subscriptionLabel[physio.subscription_status]}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setSubscription.isPending || physio.subscription_status === 'inactive'}
                        onClick={() => setSubscription.mutate({ id: physio.id, status: 'inactive' })}
                      >
                        {pt.saas.endSubscription}
                      </Button>
                      <Button
                        size="sm"
                        disabled={setSubscription.isPending || physio.subscription_status === 'active'}
                        onClick={() => setSubscription.mutate({ id: physio.id, status: 'active' })}
                      >
                        {pt.saas.reactivate}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    
  )
}

export function AdminAppointmentsPage() {
  const query = useQuery({
    queryKey: ['admin-appointments'],
    queryFn: getAdminAppointments,
  })

  return (
    
      <div className="space-y-6">
        <h1 className="page-title">{pt.admin.appointments}</h1>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fisioterapeuta</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((a) => {
                  const patient = a.patient as { profiles: { full_name: string } | null } | null
                  const physio = a.physiotherapist as { profiles: { full_name: string } | null } | null
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{formatDateTime(a.scheduled_at)}</TableCell>
                      <TableCell>{patient?.profiles?.full_name ?? '—'}</TableCell>
                      <TableCell>{physio?.profiles?.full_name ?? '—'}</TableCell>
                      <TableCell>{MODALITY_LABELS[a.modality]}</TableCell>
                      <TableCell><Badge variant="outline">{APPOINTMENT_STATUS_LABELS[a.status]}</Badge></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    
  )
}

export function AdminAuditLogsPage() {
  const query = useQuery({
    queryKey: queryKeys.auditLogs(),
    queryFn: () => getAuditLogs({ limit: 100 }),
  })

  return (
    
      <div className="space-y-6">
        <h1 className="page-title">{pt.audit.title}</h1>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pt.audit.date}</TableHead>
                  <TableHead>{pt.audit.action}</TableHead>
                  <TableHead>{pt.audit.entity}</TableHead>
                  <TableHead>{pt.audit.actor}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateTime(log.created_at)}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ''}</TableCell>
                    <TableCell className="font-mono text-xs">{log.actor_id?.slice(0, 8) ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    
  )
}
