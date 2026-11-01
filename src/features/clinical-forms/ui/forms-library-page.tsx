import { Link } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { CLINIC_FORMS } from '../model/catalog'
import { downloadClinicFormPdf } from '../pdf/blank-form-pdf'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { useState } from 'react'

export function PhysioFormsPage() {
  const [busySlug, setBusySlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async (slug: string) => {
    const form = CLINIC_FORMS.find((item) => item.slug === slug)
    if (!form) return
    setBusySlug(slug)
    setError(null)
    try {
      await downloadClinicFormPdf(form)
    } catch {
      setError(pt.report.pdfError)
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{pt.clinic.formsTitle}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{pt.clinic.formsSubtitle}</p>
      </div>
      {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {CLINIC_FORMS.map((form) => (
          <Card key={form.slug}>
            <CardHeader>
              <CardTitle className="text-base">{form.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">{form.description}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to={ROUTES.physio.form(form.slug)}>{pt.clinic.preview}</Link>
                </Button>
                <Button onClick={() => void handleDownload(form.slug)} disabled={busySlug === form.slug}>
                  <FileDown className="h-4 w-4" />
                  {busySlug === form.slug ? pt.report.generatingPdf : pt.clinic.downloadPdf}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
