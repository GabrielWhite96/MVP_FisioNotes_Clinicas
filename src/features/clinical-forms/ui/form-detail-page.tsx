import { Link, useParams } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { useState } from 'react'
import { getClinicForm } from '../model/catalog'
import { downloadClinicFormPdf } from '../pdf/blank-form-pdf'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/button'
import { ErrorState } from '@/shared/ui/states'

export function PhysioFormDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const form = getClinicForm(slug ?? '')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!form) {
    return <ErrorState message={pt.clinic.formNotFound} />
  }

  const handleDownload = async () => {
    setGenerating(true)
    setError(null)
    try {
      await downloadClinicFormPdf(form)
    } catch {
      setError(pt.report.pdfError)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={ROUTES.physio.forms}>{pt.common.back}</Link>
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{form.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{form.description}</p>
        </div>
        <Button onClick={() => void handleDownload()} disabled={generating}>
          <FileDown className="h-4 w-4" />
          {generating ? pt.report.generatingPdf : pt.clinic.printForm}
        </Button>
      </div>
      {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}
      <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinic.formsSubtitle}</p>
    </div>
  )
}
