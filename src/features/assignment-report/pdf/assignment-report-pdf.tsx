import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { pt } from '@/shared/config/i18n/pt'
import { formatDate } from '@/shared/lib/dates'

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 46,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  hero: {
    backgroundColor: '#0f766e',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  kicker: {
    color: '#ccfbf1',
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 3,
  },
  heroMeta: {
    color: '#ecfeff',
    fontSize: 9,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#0f766e',
    marginTop: 8,
    marginBottom: 6,
  },
  muted: {
    color: '#64748b',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
  },
  colName: { width: '46%', paddingRight: 8 },
  colStart: { width: '27%' },
  colEnd: { width: '27%' },
  header: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
  },
})

export type AssignmentReportRow = {
  id: string
  name: string
  startedOn: string
  endedOn: string | null
}

export type AssignmentReportPdfProps = {
  kind: 'patient' | 'staff'
  subjectName: string
  periodLabel: string
  issuedAt: string
  rows: AssignmentReportRow[]
}

function fileSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'relatorio'
}

export function assignmentReportFileName(kind: 'patient' | 'staff', name: string, issuedAt = new Date()) {
  const prefix = kind === 'patient' ? 'vinculos-paciente' : 'vinculos-fisioterapeuta'
  return `${prefix}-${fileSlug(name)}-${issuedAt.toISOString().slice(0, 10)}.pdf`
}

export function AssignmentReportPdf({
  kind,
  subjectName,
  periodLabel,
  issuedAt,
  rows,
}: AssignmentReportPdfProps) {
  const copy = pt.clinic
  const title = kind === 'patient' ? copy.patientLinksReport : copy.staffLinksReport
  const nameHeader = kind === 'patient' ? pt.clinic.responsible : pt.physio.patients

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>{pt.app.name}</Text>
          <Text style={styles.title}>{subjectName}</Text>
          <Text style={styles.heroMeta}>{title}</Text>
        </View>
        <Text style={styles.muted}>
          {pt.report.periodLabel}: {periodLabel} · {pt.report.issuedAt}: {issuedAt}
        </Text>
        <Text style={styles.sectionTitle}>{copy.assignmentHistory}</Text>
        <View style={styles.row}>
          <Text style={[styles.colName, styles.header]}>{nameHeader}</Text>
          <Text style={[styles.colStart, styles.header]}>{copy.startDate}</Text>
          <Text style={[styles.colEnd, styles.header]}>{copy.endDate}</Text>
        </View>
        {rows.length ? rows.map((row) => (
          <View key={row.id} style={styles.row}>
            <Text style={styles.colName}>{row.name}</Text>
            <Text style={styles.colStart}>{formatDate(row.startedOn)}</Text>
            <Text style={styles.colEnd}>{row.endedOn ? formatDate(row.endedOn) : copy.ongoing}</Text>
          </View>
        )) : (
          <Text style={styles.muted}>{copy.emptyAssignments}</Text>
        )}
      </Page>
    </Document>
  )
}

export async function downloadAssignmentReportPdf(props: AssignmentReportPdfProps): Promise<void> {
  const blob = await pdf(<AssignmentReportPdf {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = assignmentReportFileName(props.kind, props.subjectName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
