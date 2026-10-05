/**
 * Test ciblé — fiche d'une pharmacie DE GARDE (pin ambre, ligne garde,
 * boutons d'action) + carte liste mobile + SOS.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const OUT = 'download/captures/garde-v2'

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 844 },
    permissions: ['geolocation'],
    geolocation: { latitude: 8.0603, longitude: 2.4722, accuracy: 25 }, // Savè (COLLINES)
    locale: 'fr-FR',
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(`${BASE}/patient/garde`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(6000)

  // Cible : « Ade du Marché de Savè » — pharmacie de garde COLLINES (pin ambre)
  const target = page.locator('button[aria-label="Ade du Marché de Savè"]')
  let found = await target.count()
  if (found === 0) {
    // elle est peut-être dans un cluster → zoom sur Savè
    const clusters = page.locator('button[aria-label*="zoomer"]')
    const n = await clusters.count()
    for (let i = 0; i < n; i++) {
      const b = await clusters.nth(i).boundingBox()
      if (b && b.y > 100 && b.x > 200 && b.x < 700) {
        await clusters.nth(i).click()
        await page.waitForTimeout(1800)
        break
      }
    }
    found = await target.count()
    if (found === 0 && (await clusters.count()) > 0) {
      const b = await clusters.first().boundingBox()
      if (b) { await clusters.first().click(); await page.waitForTimeout(1800) }
      found = await target.count()
    }
  }
  console.log(`[garde] pin « Ade du Marché de Savè » trouvé: ${found > 0}`)

  if (found > 0) {
    // Survol → fiche éphémère
    await target.hover()
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/g01-hover-garde.png` })
    const hoverText = await page.locator('.maplibregl-popup').textContent().catch(() => null)
    console.log(`[garde] fiche survol contient « De garde aujourd'hui »: ${hoverText?.includes("De garde aujourd'hui") ?? false}`)

    // Clic → fiche persistante + actions
    await target.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/g02-clic-garde.png` })
    const clickText = await page.locator('.maplibregl-popup').textContent().catch(() => null)
    const tel01 = clickText?.match(/01[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2}/)?.[0]
    console.log(`[garde] fiche clic: ligneGarde=${clickText?.includes("De garde aujourd'hui") ? 'OUI' : 'NON'} horaires=${clickText?.includes('08:00') && clickText?.includes('20:00') ? 'OUI' : 'NON'} tél01=${tel01 ?? 'non trouvé'} emoji=${/📍|📞|🧭|⭐/.test(clickText ?? '') ? 'PRÉSENT (pb!)' : 'aucun ✓'}`)

    // Le pin est-il ambre ? (SVG gradient garde)
    const pinHtml = await target.innerHTML()
    console.log(`[garde] pin ambre (gradient F5B24B): ${pinHtml.includes('F5B24B') ? 'OUI' : 'NON'}`)
    // Badge nominatif présent ?
    const badge = await target.locator('span').textContent().catch(() => null)
    console.log(`[garde] badge nominatif: ${badge === 'Ade du Marché de Savè' ? 'OUI ✓' : badge ?? 'non'}`)
  }

  // ═══ Sheet mobile : carte de garde + SOS ═══
  const mCtx = await browser.newContext({
    viewport: { width: 390, height: 724 },
    permissions: ['geolocation'],
    geolocation: { latitude: 6.3728, longitude: 2.3484, accuracy: 25 },
    locale: 'fr-FR', isMobile: true, hasTouch: true,
  })
  const mp = await mCtx.newPage()
  await mp.goto(`${BASE}/patient/garde`, { waitUntil: 'networkidle', timeout: 90000 })
  await mp.waitForTimeout(6000)
  // ouvrir le sheet
  await mp.locator('text=/pharmacie\(s\) de garde/i').first().tap()
  await mp.waitForTimeout(1500)
  await mp.screenshot({ path: `${OUT}/g03-mobile-garde-cards.png` })
  const sheetText = await mp.locator('.md\\:hidden').last().textContent().catch(() => null)
  const sosHref = await mp.locator('a[href^="tel:+22901"]').first().getAttribute('href').catch(() => null)
  console.log(`[mobile] cartes garde dans sheet: ${sheetText?.includes('De garde aujourd\'hui') ? 'OUI' : 'NON'} · SOS tel: ${sosHref ?? 'non'}`)

  console.log(`\n═══ ERREURS (${errors.length}) ═══`)
  errors.slice(0, 8).forEach((e) => console.log('  ✗ ' + e.slice(0, 160)))
  if (errors.length === 0) console.log('  aucune ✓')

  await browser.close()
}

main().catch((e) => { console.error('ÉCHEC:', e); process.exit(1) })
