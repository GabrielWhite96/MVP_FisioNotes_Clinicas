export interface DischargeStructuredData {
  dischargeDate: string
  responsibleName: string
  treatmentSummary: string
  conducts: string
  guidelines: string
  destination: string
}

export function emptyDischargeData(prefill?: Partial<DischargeStructuredData>): DischargeStructuredData {
  return {
    dischargeDate: prefill?.dischargeDate ?? '',
    responsibleName: prefill?.responsibleName ?? '',
    treatmentSummary: prefill?.treatmentSummary ?? '',
    conducts: prefill?.conducts ?? '',
    guidelines: prefill?.guidelines ?? '',
    destination: prefill?.destination ?? '',
  }
}

export function summarizeDischarge(data: DischargeStructuredData): string {
  const lines: string[] = []
  if (data.dischargeDate) lines.push(`Data da alta: ${data.dischargeDate}`)
  if (data.responsibleName) lines.push(`Responsável: ${data.responsibleName}`)
  if (data.treatmentSummary) lines.push(`Resumo: ${data.treatmentSummary}`)
  if (data.conducts) lines.push(`Condutas: ${data.conducts}`)
  if (data.guidelines) lines.push(`Orientações: ${data.guidelines}`)
  if (data.destination) lines.push(`Destino: ${data.destination}`)
  return lines.join('\n')
}
