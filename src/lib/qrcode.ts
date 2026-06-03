import QRCode from 'qrcode'

export interface VaccinationQRData {
  patientId: string
  patientNom: string
  patientPrenom: string
  vaccinations: Array<{
    vaccin: string
    date: string
    lot: string
  }>
}

export async function generateVaccinationQR(data: VaccinationQRData): Promise<string> {
  const payload = JSON.stringify({
    type: 'MEDIHELM_VACCINATION',
    version: 1,
    ...data,
    generatedAt: new Date().toISOString(),
  })

  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    width: 256,
    margin: 2,
    color: {
      dark: '#085041',
      light: '#FFFFFF',
    },
  })
}
