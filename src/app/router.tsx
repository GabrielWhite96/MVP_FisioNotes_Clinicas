import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { ProtectedRoute, RoleGuard, GuestRoute, SubscriptionGuard } from '@/features/auth/ui/guards'
import { HomePage, NotFoundPage } from '@/pages/home-page'
import { LoginPage, SubscribePage, ForgotPasswordPage, ResetPasswordPage, InviteAcceptPage, CaregiverSignupPage } from '@/pages/auth/auth-pages'
import {
  PatientDashboardPage,
  PatientProfilePage,
  PatientAppointmentsPage,
  PatientAppointmentDetailPage,
  PatientExercisesPage,
  PatientCheckInPage,
  PatientNotificationsPage,
  PatientCaregiversPage,
} from '@/pages/patient/patient-pages'
import {
  PhysioDashboardPage,
  PhysioAgendaPage,
  PhysioBillingPage,
  PhysioPatientsPage,
  PhysioPatientNewPage,
  PhysioPatientDetailPage,
  PhysioAppointmentNewPage,
  PhysioAppointmentDetailPage,
  PhysioProfilePage,
  PhysioNotificationsPage,
} from '@/pages/physio/physio-pages'
import { PhysioPatientReportPage, PhysioReportsPage } from '@/features/patient-report/ui/patient-report-page'
import { PatientAssignmentReportPage } from '@/features/assignment-report/ui/patient-assignment-report-page'
import { StaffAssignmentReportPage } from '@/features/assignment-report/ui/staff-assignment-report-page'
import { PhysioFormsPage } from '@/features/clinical-forms/ui/forms-library-page'
import { PhysioFormDetailPage } from '@/features/clinical-forms/ui/form-detail-page'
import {
  PhysioStaffPage,
  PhysioStaffNewPage,
  PhysioStaffDetailPage,
} from '@/pages/physio/clinic-staff-pages'
import { PhysioToolDetailPage } from '@/features/clinical-tools/ui/tool-detail-page'
import { PhysioToolsPage } from '@/features/clinical-tools/ui/tools-page'
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminAppointmentsPage,
  AdminAuditLogsPage,
} from '@/pages/admin/admin-pages'
import { CaregiverDashboardPage } from '@/pages/caregiver/caregiver-pages'
import { PhysioSubscriptionPage } from '@/pages/physio/subscription-page'
import { AppLayout } from '@/widgets/layout/app-layout'
import { ROUTES } from '@/shared/config/routes'

export const router = createBrowserRouter([
  { path: ROUTES.home, element: <HomePage /> },
  {
    element: <GuestRoute />,
    children: [
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.subscribe, element: <SubscribePage /> },
      { path: ROUTES.signup, element: <Navigate to={ROUTES.subscribe} replace /> },
      { path: ROUTES.forgotPassword, element: <ForgotPasswordPage /> },
      { path: '/auth/invite/:token', element: <InviteAcceptPage /> },
      { path: '/auth/caregiver-signup', element: <CaregiverSignupPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleGuard allowedRoles={['patient']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: ROUTES.patient.dashboard, element: <PatientDashboardPage /> },
              { path: ROUTES.patient.profile, element: <PatientProfilePage /> },
              { path: ROUTES.patient.appointments, element: <PatientAppointmentsPage /> },
              { path: '/patient/appointments/:id', element: <PatientAppointmentDetailPage /> },
              { path: ROUTES.patient.exercises, element: <PatientExercisesPage /> },
              { path: ROUTES.patient.checkIn, element: <PatientCheckInPage /> },
              { path: ROUTES.patient.notifications, element: <PatientNotificationsPage /> },
              { path: ROUTES.patient.caregivers, element: <PatientCaregiversPage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allowedRoles={['physiotherapist']} />,
        children: [
          {
            element: <SubscriptionGuard />,
            children: [
          {
            element: <AppLayout />,
            children: [
              { path: ROUTES.physio.dashboard, element: <PhysioDashboardPage /> },
              { path: ROUTES.physio.subscription, element: <PhysioSubscriptionPage /> },
              { path: ROUTES.physio.agenda, element: <PhysioAgendaPage /> },
              { path: ROUTES.physio.billing, element: <PhysioBillingPage /> },
              { path: ROUTES.physio.reports, element: <PhysioReportsPage /> },
              { path: '/physio/reports/paciente/:id', element: <PatientAssignmentReportPage /> },
              { path: '/physio/reports/fisioterapeuta/:id', element: <StaffAssignmentReportPage /> },
              { path: ROUTES.physio.tools, element: <PhysioToolsPage /> },
              { path: '/physio/ferramentas/:slug', element: <PhysioToolDetailPage /> },
              { path: ROUTES.physio.forms, element: <PhysioFormsPage /> },
              { path: '/physio/fichas/:slug', element: <PhysioFormDetailPage /> },
              { path: ROUTES.physio.staff, element: <PhysioStaffPage /> },
              { path: ROUTES.physio.staffNew, element: <PhysioStaffNewPage /> },
              { path: '/physio/fisioterapeutas/:id', element: <PhysioStaffDetailPage /> },
              { path: ROUTES.physio.patients, element: <PhysioPatientsPage /> },
              { path: ROUTES.physio.patientNew, element: <PhysioPatientNewPage /> },
              { path: '/physio/patients/:id/relatorio', element: <PhysioPatientReportPage /> },
              { path: '/physio/patients/:id', element: <PhysioPatientDetailPage /> },
              { path: ROUTES.physio.appointmentNew, element: <PhysioAppointmentNewPage /> },
              { path: '/physio/appointments/:id', element: <PhysioAppointmentDetailPage /> },
              { path: ROUTES.physio.profile, element: <PhysioProfilePage /> },
              { path: ROUTES.physio.notifications, element: <PhysioNotificationsPage /> },
            ],
          },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allowedRoles={['caregiver']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: ROUTES.caregiver.dashboard, element: <CaregiverDashboardPage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allowedRoles={['admin']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: ROUTES.admin.dashboard, element: <AdminDashboardPage /> },
              { path: ROUTES.admin.users, element: <AdminUsersPage /> },
              { path: ROUTES.admin.appointments, element: <AdminAppointmentsPage /> },
              { path: ROUTES.admin.auditLogs, element: <AdminAuditLogsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: ROUTES.resetPassword, element: <ResetPasswordPage /> },
  { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
