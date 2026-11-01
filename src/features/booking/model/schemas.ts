import { z } from 'zod'

/** @deprecated Marketplace booking schema — kept only for legacy test compatibility. */
export const bookingSchema = z.object({
  modality: z.enum(['telehealth', 'home_visit']),
  physiotherapistId: z.string().uuid(),
  date: z.date(),
  time: z.string().min(1),
  notes: z.string().optional(),
})

export type BookingFormData = z.infer<typeof bookingSchema>
