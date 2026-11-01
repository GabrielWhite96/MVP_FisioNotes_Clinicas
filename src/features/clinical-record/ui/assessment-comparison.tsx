import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ClinicalRecord } from '@/shared/types/database'
import type { AssessmentStructuredData } from '@/entities/clinical-record/model/assessment-schema'
import type { VitalSigns } from '@/entities/clinical-record/model/vital-signs'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState } from '@/shared/ui/states'
import { formatDate } from '@/shared/lib/dates'
import { pt } from '@/shared/config/i18n/pt'

interface AssessmentComparisonProps {
  assessments: ClinicalRecord[]
}

function asAssessment(record: ClinicalRecord | undefined): AssessmentStructuredData | null {
  if (!record?.structured_data || typeof record.structured_data !== 'object') return null
  const data = record.structured_data as unknown as AssessmentStructuredData
  if (!data.anamnese || !data.physicalExam) return null
  return data
}

function vitalsCompareRows(a?: VitalSigns, b?: VitalSigns) {
  const rows: Array<{ label: string; key: keyof VitalSigns }> = [
    { label: 'FC', key: 'hr' },
    { label: 'FR', key: 'rr' },
    { label: 'SpO2', key: 'spo2' },
    { label: 'PA sistólica', key: 'bpSystolic' },
    { label: 'PA diastólica', key: 'bpDiastolic' },
    { label: 'Temperatura', key: 'temperature' },
  ]
  const fmt = (v: number | null | undefined) => (v == null ? '—' : String(v))
  return rows.map(({ label, key }) => (
    <tr key={key} className="border-b border-[var(--color-border)]">
      <td className="py-2 pr-2 font-medium">{label}</td>
      <td className="py-2 pr-2">{fmt(a?.[key])}</td>
      <td className="py-2">{fmt(b?.[key])}</td>
    </tr>
  ))
}

export function AssessmentComparison({ assessments }: AssessmentComparisonProps) {
  const [leftId, setLeftId] = useState(assessments[0]?.id ?? '')
  const [rightId, setRightId] = useState(assessments[assessments.length - 1]?.id ?? '')

  const left = assessments.find((a) => a.id === leftId)
  const right = assessments.find((a) => a.id === rightId)
  const leftData = asAssessment(left)
  const rightData = asAssessment(right)

  const chartData = useMemo(() => {
    return assessments
      .map((r) => {
        const data = asAssessment(r)
        const v = data?.physicalExam.vitals
        if (!v) return null
        return {
          date: formatDate(r.created_at),
          FC: v.hr,
          FR: v.rr,
          SpO2: v.spo2,
          PAs: v.bpSystolic,
          PAd: v.bpDiastolic,
          Temp: v.temperature,
        }
      })
      .filter(Boolean) as Array<Record<string, string | number | null>>
  }, [assessments])

  if (assessments.length < 2) {
    return (
      <EmptyState
        title={pt.clinicalRecord.comparisonNeedTwo}
        description={pt.clinicalRecord.comparisonNeedTwoHint}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{pt.clinicalRecord.compareA}</Label>
          <Select value={leftId} onValueChange={setLeftId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {formatDate(a.created_at)} —{' '}
                  {a.record_type === 'reassessment'
                    ? pt.clinicalRecord.reassessment
                    : pt.clinicalRecord.initialAssessment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{pt.clinicalRecord.compareB}</Label>
          <Select value={rightId} onValueChange={setRightId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {formatDate(a.created_at)} —{' '}
                  {a.record_type === 'reassessment'
                    ? pt.clinicalRecord.reassessment
                    : pt.clinicalRecord.initialAssessment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pt.clinicalRecord.sideBySide}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left">
                <th className="py-2 pr-2">{pt.clinicalRecord.field}</th>
                <th className="py-2 pr-2">{pt.clinicalRecord.compareA}</th>
                <th className="py-2">{pt.clinicalRecord.compareB}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-2 pr-2 font-medium">{pt.clinicalRecord.chiefComplaint}</td>
                <td className="py-2 pr-2">{leftData?.anamnese.chiefComplaint || '—'}</td>
                <td className="py-2">{rightData?.anamnese.chiefComplaint || '—'}</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-2 pr-2 font-medium">{pt.clinicalRecord.shortTermGoal}</td>
                <td className="py-2 pr-2">{leftData?.therapeuticPlan.shortTermGoal || '—'}</td>
                <td className="py-2">{rightData?.therapeuticPlan.shortTermGoal || '—'}</td>
              </tr>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-2 pr-2 font-medium">{pt.clinicalRecord.longTermGoal}</td>
                <td className="py-2 pr-2">{leftData?.therapeuticPlan.longTermGoal || '—'}</td>
                <td className="py-2">{rightData?.therapeuticPlan.longTermGoal || '—'}</td>
              </tr>
              {vitalsCompareRows(leftData?.physicalExam.vitals, rightData?.physicalExam.vitals)}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {chartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{pt.clinicalRecord.vitalsChart}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="FC" stroke="#0f766e" connectNulls />
                <Line type="monotone" dataKey="FR" stroke="#0369a1" connectNulls />
                <Line type="monotone" dataKey="SpO2" stroke="#7c3aed" connectNulls />
                <Line type="monotone" dataKey="PAs" stroke="#b45309" connectNulls />
                <Line type="monotone" dataKey="PAd" stroke="#be123c" connectNulls />
                <Line type="monotone" dataKey="Temp" stroke="#15803d" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
