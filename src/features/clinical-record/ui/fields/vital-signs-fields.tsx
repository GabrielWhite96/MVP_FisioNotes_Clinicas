import type { VitalSigns } from '@/entities/clinical-record/model/vital-signs'
import { Input, Label } from '@/shared/ui/input'

interface VitalSignsFieldsProps {
  value: VitalSigns
  onChange: (next: VitalSigns) => void
}

function parseNum(raw: string): number | null {
  if (raw === '' || raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

const FIELDS: Array<{ key: keyof VitalSigns; label: string; step?: string }> = [
  { key: 'hr', label: 'FC (bpm)' },
  { key: 'rr', label: 'FR (rpm)' },
  { key: 'spo2', label: 'SpO₂ (%)' },
  { key: 'bpSystolic', label: 'PA sistólica' },
  { key: 'bpDiastolic', label: 'PA diastólica' },
  { key: 'temperature', label: 'Temperatura (°C)', step: '0.1' },
]

export function VitalSignsFields({ value, onChange }: VitalSignsFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {FIELDS.map(({ key, label, step }) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={`vital-${key}`}>{label}</Label>
          <Input
            id={`vital-${key}`}
            type="number"
            step={step ?? '1'}
            value={value[key] ?? ''}
            onChange={(e) => onChange({ ...value, [key]: parseNum(e.target.value) })}
          />
        </div>
      ))}
    </div>
  )
}
