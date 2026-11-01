export const BRAND_NAME = 'Fisionotes'

export const BRAND_LOGOS = {
  icon: '/logos/logo_semfundo_sem_nome.png',
  stacked: '/logos/logo_semfundo_com_nome_embaixo.png',
  horizontal: '/logos/logo_semfundo_com_nome_horizontal.png',
} as const

export type BrandLogoLayout = keyof typeof BRAND_LOGOS
