import { InstitutionsLayoutInner } from '@/components/institutions/layout-inner'

export default function InstitutionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <InstitutionsLayoutInner>{children}</InstitutionsLayoutInner>
}
