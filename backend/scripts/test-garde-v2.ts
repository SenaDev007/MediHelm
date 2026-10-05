/**
 * Validation Playwright — carte garde + géolocalisation MediHelm v2.
 * Géolocalisation accordée (Cotonou) : point utilisateur, itinéraire OSRM,
 * panneau marche/moto/voiture, mode « en route », popup stable au survol.
 *
 * Usage: bash scripts/serve-and-test.sh scripts/test-garde-v2.ts
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  // ═══ 1. Page garde desktop — vue nationale ═══
  await page.goto(`${BASE}/patient/garde`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${OUT}/t01-garde-national.png` })

  const pinCount = await page.locator('.medihelm-pin').count()
  const badgeCount = await page.locator('.medihelm-pin > span').count()
  const clusterCount = await page.locator('button[aria-label*="zoomer"]').count()
  const userDot = await page.locator('.animate-ping').count()
  console.log(`[1] pins=${pinCount} badges=${badgeCount} clusters=${clusterCount} pointUtilisateur=${userDot > 0}`)

  // ═══ 2. Survol d'un cluster → étiquette département ═══
  const cluster = page.locator('button[aria-label*="zoomer"]').first()
  if (await cluster.count() > 0) {
    await cluster.hover()
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/t02-cluster-hover-departement.png` })
    const tip = await page.locator('button[aria-label*="zoomer"] >> xpath=..').first().locator('div').count()
    console.log(`[2] survol cluster → étiquette: ${tip > 0 ? 'OK' : 'non détecté (voir capture)'}`)
  }

  // ═══ 3. Zoom Parakou (clic cluster) → pins individuels + badges ═══
  await cluster.click()
  await page.waitForTimeout(2500)
  // clique à nouveau pour zoomer davantage si des clusters subsistent
  const cluster2 = page.locator('button[aria-label*="zoomer"]').first()
  if (await cluster2.count() > 0) {
    await cluster2.click()
    await page.waitForTimeout(2000)
  }
  await page.screenshot({ path: `${OUT}/t03-zoom-pins-badges.png` })
  const badgesZoom = await page.locator('.medihelm-pin > span').count()
  console.log(`[3] zoom ville → pins=${await page.locator('.medihelm-pin').count()} badges=${badgesZoom}`)

  // ═══ 4. Survol d'un pin → fiche holographique AU-DESSUS + stable ═══
  // Pin entièrement visible (hors header 56px, hors panneau droit 380px)
  const visiblePin = page.locator('.medihelm-pin').filter({ hasNot: page.locator('span') }).first()
  const allPins = await page.locator('.medihelm-pin').all()
  let pinEl: import('playwright').Locator | null = null
  for (const cand of allPins) {
    const b = await cand.boundingBox()
    if (b && b.y > 90 && b.y + b.height < 780 && b.x > 30 && b.x + b.width < 990) {
      pinEl = cand
      break
    }
  }
  if (!pinEl) pinEl = visiblePin
  if (pinEl && (await pinEl.count() > 0)) {
    const pin = pinEl
    const box = await pin.boundingBox()
    await pin.hover()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/t04-hover-fiche.png` })
    const popupOpen = await page.locator('.maplibregl-popup').count()
    // vérifie que la fiche reste ouverte après 800ms sans bouger la souris
    await page.waitForTimeout(800)
    const popupStable = await page.locator('.maplibregl-popup').count()
    // position de la fiche par rapport au pin (au-dessus ?)
    const popupBox = popupStable > 0 ? await page.locator('.maplibregl-popup').first().boundingBox() : null
    const above = popupBox && box ? (popupBox.y + popupBox.height) <= box.y + box.height + 80 : false
    console.log(`[4] survol: popup=${popupOpen > 0 ? 'ouverte' : 'ABSENTE'} stable800ms=${popupStable > 0 ? 'OUI' : 'NON'} auDessusPin=${above ? 'OUI' : 'non'}`)

    // ═══ 5. Clic sur le pin → fiche persistante avec actions ═══
    await pin.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/t05-clic-fiche.png` })
    const popupClick = await page.locator('.maplibregl-popup').count()
    const hasCall = await page.locator('.maplibregl-popup').getByText('Appeler').count()
    const hasRoute = await page.locator('.maplibregl-popup').getByText('Itinéraire').count()
    const noTitulaire = await page.locator('.maplibregl-popup').getByText('Titulaire').count()
    console.log(`[5] clic: popup=${popupClick > 0 ? 'persistante' : 'ABSENTE'} Appeler=${hasCall > 0} Itinéraire=${hasRoute > 0} titulaire=${noTitulaire > 0 ? 'PRÉSENT (à supprimer!)' : 'absent ✓'}`)
  }

  // ═══ 6. Bouton « Plus proche » → itinéraire + panneau transport ═══
  await page.getByRole('button', { name: 'Plus proche' }).click()
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `${OUT}/t06-plus-proche-itineraire.png` })
  const hasTravelPanel = await page.getByText('Y aller').count()
  const marche = await page.getByRole('button', { name: /Marche/ }).count()
  const moto = await page.getByRole('button', { name: /Moto/ }).count()
  const voiture = await page.getByRole('button', { name: /Voiture/ }).count()
  console.log(`[6] plusProche: panneau=${hasTravelPanel > 0 ? 'OK' : 'ABSENT'} marche=${marche > 0} moto=${moto > 0} voiture=${voiture > 0}`)

  // ═══ 7. Mode marche → durées mises à jour ═══
  if (marche > 0) {
    await page.getByRole('button', { name: /Marche/ }).click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/t07-marche.png` })
  }

  // ═══ 8. « Y aller » → navigation (en route) ═══
  const yAller = page.getByRole('button', { name: 'Y aller' })
  if (await yAller.count() > 0) {
    await yAller.click()
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `${OUT}/t08-en-route.png` })
    const enRoute = await page.getByText(/restants|En déplacement|arrivé/i).count()
    console.log(`[8] Y aller: signalEnRoute=${enRoute > 0 ? 'OK' : 'non visible'}`)
    // Terminer la navigation
    const term = page.getByRole('button', { name: 'Terminer' })
    if (await term.count() > 0) await term.click()
    await page.waitForTimeout(500)
  }

  // ═══ 9. Planning desktop ═══
  await page.getByRole('button', { name: 'Planning' }).click()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/t09-planning-desktop.png`, fullPage: false })
  const gardeCards = await page.getByText(/De garde aujourd'hui/).count()
  console.log(`[9] planning: cartesGarde=${gardeCards}`)

  // ═══ 10. Mobile 390×724 ═══
  const mCtx = await browser.newContext({
    viewport: { width: 390, height: 724 },
    permissions: ['geolocation'],
    geolocation: { latitude: 6.3728, longitude: 2.3484, accuracy: 25 },
    locale: 'fr-FR',
    isMobile: true,
    hasTouch: true,
  })
  const mp = await mCtx.newPage()
  mp.on('pageerror', (e) => errors.push('mobile: ' + String(e)))
  await mp.goto(`${BASE}/patient/garde`, { waitUntil: 'networkidle', timeout: 90000 })
  await mp.waitForTimeout(6000)
  await mp.screenshot({ path: `${OUT}/t10-mobile-peek.png` })
  // tap cluster → bandeau département (cluster dans la zone visible, hors sheet bas)
  const mClusters = mp.locator('button[aria-label*="zoomer"]')
  const mClusterCount = await mClusters.count()
  let tapped = false
  for (let i = 0; i < mClusterCount; i++) {
    const cand = mClusters.nth(i)
    const b = await cand.boundingBox()
    if (b && b.y > 70 && b.y + b.height < 560 && b.x > 10 && b.x + b.width < 380) {
      await cand.tap()
      tapped = true
      break
    }
  }
  if (tapped) {
    await mp.waitForTimeout(1200)
    await mp.screenshot({ path: `${OUT}/t11-mobile-tap-cluster.png` })
    const banner = await mp.getByText(/officines ·/).count()
    console.log(`[10] mobile tap cluster → bandeau département: ${banner > 0 ? 'OK' : 'voir capture t11'}`)
  } else {
    console.log(`[10] mobile: aucun cluster visible (${mClusterCount} au total) — voir t10`)
  }
  // sheet half
  const sheetHeader = mp.locator('text=/pharmacie\(s\) de garde/i').first()
  if (await sheetHeader.count() > 0) {
    await sheetHeader.tap()
    await mp.waitForTimeout(1200)
    await mp.screenshot({ path: `${OUT}/t12-mobile-half.png` })
    console.log(`[10] sheet half: capture OK`)
  }
  // pharmacies mobile
  await mp.goto(`${BASE}/patient/pharmacies`, { waitUntil: 'networkidle', timeout: 90000 })
  await mp.waitForTimeout(6000)
  await mp.screenshot({ path: `${OUT}/t13-pharmacies-mobile.png` })
  await mCtx.close()

  // ═══ 11. Tablette 820×1124 ═══
  const tCtx = await browser.newContext({
    viewport: { width: 820, height: 1124 },
    permissions: ['geolocation'],
    geolocation: { latitude: 6.3728, longitude: 2.3484, accuracy: 25 },
    locale: 'fr-FR',
  })
  const tp = await tCtx.newPage()
  await tp.goto(`${BASE}/patient/garde`, { waitUntil: 'networkidle', timeout: 90000 })
  await tp.waitForTimeout(6000)
  await tp.screenshot({ path: `${OUT}/t14-garde-tablette.png` })
  await tp.goto(`${BASE}/patient/pharmacies`, { waitUntil: 'networkidle', timeout: 90000 })
  await tp.waitForTimeout(6000)
  await tp.screenshot({ path: `${OUT}/t15-pharmacies-tablette.png` })
  await tCtx.close()

  // ═══ 12. Page géolocalisation desktop — tout le Bénin ═══
  await page.goto(`${BASE}/patient/pharmacies`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${OUT}/t16-pharmacies-desktop.png` })
  const toutBenin = await page.getByText('Tout le Bénin').count()
  const panelPharm = await page.getByText(/officines — tout le Bénin|pharmacie\(s\) dans un rayon/).count()
  console.log(`[12] pharmacies desktop: puceToutLeBénin=${toutBenin > 0} panneau=${panelPharm > 0}`)

  // Petit smartphone 360×740
  const sCtx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, locale: 'fr-FR' })
  const sp = await sCtx.newPage()
  await sp.goto(`${BASE}/patient/garde`, { waitUntil: 'networkidle', timeout: 90000 })
  await sp.waitForTimeout(5000)
  await sp.screenshot({ path: `${OUT}/t17-garde-360px.png` })
  await sCtx.close()

  console.log(`\n═══ ERREURS CONSOLE (${errors.length}) ═══`)
  errors.slice(0, 12).forEach((e) => console.log('  ✗ ' + e.slice(0, 180)))
  if (errors.length === 0) console.log('  aucune ✓')

  await browser.close()
}

main().catch((e) => { console.error('ÉCHEC:', e); process.exit(1) })
