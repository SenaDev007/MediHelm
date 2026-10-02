import type { ReactNode } from 'react'

export interface PortalCardProps {
  icon: ReactNode
  title: string
  subtitle: string
  description: string
  features: readonly string[]
  href: string
  displayUrl: string
  accent: 'teal' | 'amber' | 'navy' | 'slate'
  badge?: string
}

export function PortalCard({
  icon,
  title,
  subtitle,
  description,
  features,
  href,
  displayUrl,
  accent,
  badge,
}: PortalCardProps) {
  return (
    <article className={`portal-card portal-card--${accent}`}>
      <div className="portal-card__topline">
        <span className="portal-card__icon" aria-hidden="true">{icon}</span>
        {badge ? <span className="portal-card__badge">{badge}</span> : null}
      </div>
      <p className="portal-card__eyebrow">{subtitle}</p>
      <h2 className="portal-card__title">{title}</h2>
      <p className="portal-card__description">{description}</p>
      <ul className="portal-card__features">
        {features.map((feature) => <li key={feature}>{feature}</li>)}
      </ul>
      <div className="portal-card__action">
        <a href={href} className="portal-card__link">Accéder au portail <span aria-hidden="true">→</span></a>
        <span className="portal-card__url">{displayUrl}</span>
      </div>
    </article>
  )
}
