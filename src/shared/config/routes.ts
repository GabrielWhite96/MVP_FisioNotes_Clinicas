export const ROUTES = {
  home: '/',
  login: '/auth/login',
  signup: '/auth/signup',
  subscribe: '/assinar',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  invite: (token: string) => `/auth/invite/${token}`,
  patient: {
    dashboard: '/patient/dashboard',
    profile: '/patient/profile',
    appointments: '/patient/appointments',
    appointment: (id: string) => `/patient/appointments/${id}`,
    exercises: '/patient/exercises',
    checkIn: '/patient/check-in',
    notifications: '/patient/notifications',
    caregivers: '/patient/caregivers',
  },
  physio: {
    dashboard: '/physio/dashboard',
    agenda: '/physio/agenda',
    patients: '/physio/patients',
    reports: '/physio/reports',
    patientAssignmentReport: (id: string) => `/physio/reports/paciente/${id}`,
    staffAssignmentReport: (id: string) => `/physio/reports/fisioterapeuta/${id}`,
    tools: '/physio/ferramentas',
    tool: (slug: string) => `/physio/ferramentas/${slug}`,
    forms: '/physio/fichas',
    form: (slug: string) => `/physio/fichas/${slug}`,
    staff: '/physio/fisioterapeutas',
    staffNew: '/physio/fisioterapeutas/new',
    staffDetail: (id: string) => `/physio/fisioterapeutas/${id}`,
    patient: (id: string) => `/physio/patients/${id}`,
    patientReport: (id: string) => `/physio/patients/${id}/relatorio`,
    patientNew: '/physio/patients/new',
    appointment: (id: string) => `/physio/appointments/${id}`,
    appointmentNew: '/physio/appointments/new',
    billing: '/physio/billing',
    notifications: '/physio/notifications',
    profile: '/physio/profile',
    subscription: '/physio/assinatura',
  },
  caregiver: {
    dashboard: '/caregiver/dashboard',
  },
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    appointments: '/admin/appointments',
    auditLogs: '/admin/audit-logs',
  },
} as const

export const BRAZILIAN_UFS = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
] as const

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
}

export const MODALITY_LABELS: Record<string, string> = {
  telehealth: 'Tele-fisioterapia',
  home_visit: 'Atendimento domiciliar',
}

export const CLINICAL_STATUS_LABELS: Record<string, string> = {
  awaiting_assessment: 'Aguardando avaliação',
  in_treatment: 'Em tratamento',
  paused: 'Pausado',
  reassessment: 'Em reavaliação',
  discharged: 'Alta',
}

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  no_account: 'Sem conta',
  invite_pending: 'Convite pendente',
  active: 'Conta ativa',
}

export const GOAL_METRIC_LABELS: Record<string, string> = {
  distance: 'Distância',
  reps: 'Repetições',
  pain_scale: 'Escala de dor',
  custom: 'Personalizado',
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Fácil',
  moderate: 'Moderado',
  hard: 'Difícil',
}

export const BILLING_MODE_LABELS: Record<string, string> = {
  per_session: 'Por sessão',
  weekly: 'Por semana',
}

export const BANKNOTE_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  other: 'Outro',
}

export const CHARGE_STATUS_LABELS: Record<string, string> = {
  open: 'A pagar',
  partial: 'Pago em parte',
  paid: 'Pago',
  waived: 'Dispensado',
}
