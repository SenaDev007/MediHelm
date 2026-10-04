import { DpmedAlertEditForm } from '../../../components/dpmed-alert-edit-form'

export default async function EditDpmedAlertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DpmedAlertEditForm alertId={id} />
}
