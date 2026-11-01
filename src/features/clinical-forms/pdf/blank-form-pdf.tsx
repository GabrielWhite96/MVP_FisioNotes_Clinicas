import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { pt } from '@/shared/config/i18n/pt'
import type { ClinicFormSlug, ClinicFormTemplate } from '../model/catalog'

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.35,
  },
  hero: {
    backgroundColor: '#0f766e',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  kicker: {
    color: '#ccfbf1',
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 3,
  },
  hint: {
    color: '#ecfeff',
    fontSize: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  field: {
    flexGrow: 1,
    marginBottom: 7,
  },
  label: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  line: {
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    height: 14,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#0f766e',
    marginTop: 8,
    marginBottom: 6,
  },
  checkRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  check: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: '#64748b',
    marginRight: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 16,
  },
  sign: {
    flexGrow: 1,
  },
})

function Line({ label, grow }: { label: string; grow?: boolean }) {
  return (
    <View style={[styles.field, grow ? { flexGrow: 1, width: '100%' } : {}]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  )
}

function Box({ label, lines = 3 }: { label: string; lines?: number }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {Array.from({ length: lines }).map((_, index) => (
        <View key={index} style={[styles.line, { marginBottom: 4 }]} />
      ))}
    </View>
  )
}

function Checks({ label, options }: { label: string; options: string[] }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.checkRow}>
        {options.map((option) => (
          <View key={option} style={styles.checkItem}>
            <View style={styles.check} />
            <Text>{option}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function Header({ form }: { form: ClinicFormTemplate }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.kicker}>{pt.app.name}</Text>
      <Text style={styles.title}>{form.title}</Text>
      <Text style={styles.hint}>Preenchimento manual. Transcreva depois no prontuário do paciente.</Text>
    </View>
  )
}

function Identification() {
  return (
    <>
      <Text style={styles.sectionTitle}>Identificação</Text>
      <View style={styles.row}>
        <Line label={pt.clinic.formFields.clinic} />
        <Line label={pt.clinic.formFields.date} />
      </View>
      <Line label={pt.clinic.formFields.patient} grow />
      <View style={styles.row}>
        <Line label={pt.clinicalRecord.dateOfBirth} />
        <Line label={pt.clinicalRecord.phone} />
        <Line label={pt.clinicalRecord.identity} />
      </View>
      <Line label={pt.clinicalRecord.address} grow />
    </>
  )
}

function AnamneseFields() {
  return (
    <>
      <Text style={styles.sectionTitle}>{pt.clinicalRecord.anamnese}</Text>
      <Box label={pt.clinicalRecord.chiefComplaint} lines={2} />
      <Box label={pt.clinicalRecord.hda} lines={3} />
      <Box label={pt.clinicalRecord.hpp} lines={2} />
      <Box label={pt.clinicalRecord.medications} lines={2} />
      <Box label={pt.clinicalRecord.previousSurgeries} lines={2} />
    </>
  )
}

function ExamFields() {
  const status = ['Não avaliado', 'Sem alteração', 'Com alteração']
  return (
    <>
      <Text style={styles.sectionTitle}>{pt.clinicalRecord.physicalExam}</Text>
      <View style={styles.row}>
        <Line label="FC" />
        <Line label="FR" />
        <Line label="SpO2" />
        <Line label="PA" />
        <Line label="Temp" />
      </View>
      {[
        pt.clinicalRecord.ausculta,
        pt.clinicalRecord.mrc,
        pt.clinicalRecord.goniometria,
        pt.clinicalRecord.posturalChanges,
        pt.clinicalRecord.gaitChanges,
        pt.clinicalRecord.superficialReflexes,
        pt.clinicalRecord.deepReflexes,
        pt.clinicalRecord.staticBalance,
        pt.clinicalRecord.dynamicBalance,
        pt.clinicalRecord.specialTests,
      ].map((label) => (
        <View key={label}>
          <Checks label={label} options={status} />
          <Box label={pt.clinicalRecord.notes} lines={1} />
        </View>
      ))}
    </>
  )
}

function FindingsAndPlan() {
  return (
    <>
      <Text style={styles.sectionTitle}>{pt.clinicalRecord.specificFindings}</Text>
      <Checks label={pt.clinicalRecord.shortenings} options={['Sim', 'Não']} />
      <Box label={pt.clinicalRecord.notes} lines={1} />
      <Checks label={pt.clinicalRecord.strengthLoss} options={['Sim', 'Não']} />
      <Box label={pt.clinicalRecord.notes} lines={1} />
      <Checks label={pt.clinicalRecord.mobilityLoss} options={['Sim', 'Não']} />
      <Box label={pt.clinicalRecord.notes} lines={1} />
      <Text style={styles.sectionTitle}>{pt.clinicalRecord.therapeuticPlan}</Text>
      <Box label={pt.clinicalRecord.shortTermGoal} lines={2} />
      <Box label={pt.clinicalRecord.longTermGoal} lines={2} />
      <Line label={pt.clinicalRecord.nextEvaluation} />
    </>
  )
}

function Signature() {
  return (
    <View style={styles.footer} wrap={false}>
      <View style={styles.sign}>
        <Line label={pt.clinic.formFields.signature} />
      </View>
      <View style={styles.sign}>
        <Line label={pt.clinic.formFields.crefito} />
      </View>
    </View>
  )
}

function AssessmentBody({ reassessment }: { reassessment?: boolean }) {
  return (
    <>
      <Identification />
      {reassessment && <Box label="Comparação com a avaliação anterior" lines={3} />}
      <AnamneseFields />
      <ExamFields />
      <FindingsAndPlan />
      <Signature />
    </>
  )
}

function FormBody({ slug }: { slug: ClinicFormSlug }) {
  if (slug === 'avaliacao-inicial') return <AssessmentBody />
  if (slug === 'reavaliacao') return <AssessmentBody reassessment />
  if (slug === 'anamnese') {
    return (
      <>
        <Identification />
        <AnamneseFields />
        <Signature />
      </>
    )
  }
  if (slug === 'evolucao') {
    return (
      <>
        <View style={styles.row}>
          <Line label={pt.clinic.formFields.clinic} />
          <Line label={pt.clinic.formFields.date} />
          <Line label={pt.clinic.formFields.sessionNumber} />
        </View>
        <Line label={pt.clinic.formFields.patient} grow />
        <Line label={pt.clinic.formFields.painToday} />
        <View style={styles.row}>
          <Line label="FC" />
          <Line label="FR" />
          <Line label="SpO2" />
          <Line label="PA" />
          <Line label="Temp" />
        </View>
        <Box label={pt.clinicalRecord.sessionConducts} lines={6} />
        <Box label={pt.clinicalRecord.observations} lines={3} />
        <Line label={pt.clinicalRecord.nextEvaluation} />
        <Signature />
      </>
    )
  }
  return (
    <>
      <View style={styles.row}>
        <Line label={pt.clinic.formFields.clinic} />
        <Line label={pt.clinic.dischargeDate} />
      </View>
      <Line label={pt.clinic.formFields.patient} grow />
      <Line label={pt.clinic.dischargeResponsible} />
      <Box label={pt.clinic.treatmentSummary} lines={4} />
      <Box label={pt.clinic.dischargeConducts} lines={3} />
      <Box label={pt.clinic.dischargeGuidelines} lines={3} />
      <Box label={pt.clinic.dischargeDestination} lines={2} />
      <Signature />
    </>
  )
}

export function BlankClinicFormPdf({ form }: { form: ClinicFormTemplate }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Header form={form} />
        <FormBody slug={form.slug} />
      </Page>
    </Document>
  )
}

export function clinicFormFileName(form: ClinicFormTemplate, issuedAt = new Date()) {
  return `ficha-${form.slug}-${issuedAt.toISOString().slice(0, 10)}.pdf`
}

export async function downloadClinicFormPdf(form: ClinicFormTemplate): Promise<void> {
  const blob = await pdf(<BlankClinicFormPdf form={form} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = clinicFormFileName(form)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
