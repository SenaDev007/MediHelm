/**
 * Test ciblé 2 — sélection d'une pharmacie de garde depuis la liste :
 * vol vers le pin ambre + fiche popup avec ligne garde + horaires.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const OUT = 'download/captures/garde-v2'

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 844 },
    permissions: ['geolocation'],
    geolocation: { latitude: 6.3728, longitude: 2.3484, accuracy: 25 },
    locale: 'fr-FR',
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(`${BASE}/patient/garde`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(6000)

  // Clique la carte « Itinéraire » de la première pharmacie de garde du panneau
  const itinBtns = page.locator('aside button:has-text("Itinéraire")')
  const n = await itinBtns.count()
  console.log(`[liste] cartes garde avec bouton Itinéraire: ${n}`)
  if (n > 0) {
    await itinBtns.first().click()
    await page.waitForTimeout(9000) // vol + OSRM
    await page.screenshot({ path: `${OUT}/g04-select-liste-itineraire.png` })

    const popupText = await page.locator('.maplibregl-popup').first().textContent().catch(() => null)
    console.log(`[fiche] popup ouverte: ${popupText ? 'OUI' : 'NON'}`)
    if (popupText) {
      console.log(`[fiche] ligneGarde=${popupText.includes("De garde aujourd'hui") ? 'OUI ✓' : 'NON'} · horaires=${/08:00|20:00/.test(popupText) ? 'OUI ✓' : 'NON'} · tél01=${popupText.match(/01 \d{2} \d{2} \d{2} \d{2}/)?.[0] ?? 'non'} · emojis=${/📍|📞|🧭|⭐|🧑/.test(popupText) ? 'PRÉSENT (pb!)' : 'aucun ✓'} · titulaire=${popupText.includes('Titulaire') ? 'PRÉSENT (pb!)' : 'absent ✓'}`)
    }
    const travel = await page.getByText('Y aller').count()
    const routeVisible = await page.locator('#mh-route-source').count().catch(() => 0)
    console.log(`[itinéraire] panneau transport: ${travel > 0 ? 'OUI ✓' : 'NON'} (source carte: ${routeVisible})`)

    // Survol du pin sélectionné : halo pulsé ambre ?
    const selPin = page.locator('.medihelm-pin svg animate').first()
    console.log(`[pin] halo sélection animé: ${(await selPin.count()) > 0 ? 'OUI ✓' : 'non'}`)
  }

  // Sheet mobile FULL : cartes complètes
  const mCtx = await browser.newContext({
    viewport: { width: 390, height: 724 },
    permissions: ['geolocation'],
    geolocation: { latitude: 6.3728, longitude: 2.3484, accuracy: 25 },
    locale: 'fr-FR', isMobile: true, hasTouch: true,
  })
  const mp = await mCtx.newPage()
  await mp.goto(`${BASE}/patient/garde`, { waitUntil: 'networkidle', timeout: 90000 })
  await mp.waitForTimeout(6000)
  // passe en mode liste (Planning) → sheet full
  await mp.getByRole('button', { name: 'Planning' }).tap()
  await mp.waitForTimeout(2500)
  await mp.screenshot({ path: `${OUT}/g05-mobile-planning-full.png` })
  const listText = await mp.locator('.md\\:hidden').last().textContent().catch(() => '')
  const tel01 = listText?.match(/01 \d{2} \d{2} \d{2} \d{2}/)?.[0]
  console.log(`[mobile full] badge De garde: ${listText?.includes('De garde') ? 'OUI ✓' : 'NON'} · tél 01: ${tel01 ?? 'non'} · horaires: ${/08:00 — 20:00|20:00 — 08:00/.test(listText ?? '') ? 'OUI ✓' : 'NON'}`)

  console.log(`\n═══ ERREURS (${errors.length}) ═══`)
  errors.slice(0, 8).forEach((e) => console.log('  ✗ ' + e.slice(0, 160)))
  if (errors.length === 0) console.log('  aucune ✓')

  await browser.close()
}

main().catch((e) => { console.error('ÉCHEC:', e); process.exit(1) })
