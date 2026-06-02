import { getRequestConfig } from 'next-intl/server'
import { defaultLocale } from './config'

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale || defaultLocale
  try {
    return {
      messages: (await import(`../../messages/${resolvedLocale}.json`)).default
    }
  } catch {
    return {
      messages: (await import(`../../messages/fr.json`)).default
    }
  }
})
