'use client'

// ============================================================
// MediHelm — Avatar utilisateur réutilisable.
//
// Affiche la photo de profil si `avatarUrl` est renseignée,
// sinon les initiales « Prénom Nom » sur un dégradé teal —
// cohérent avec la page Profil de l'espace patient.
// ============================================================

import Image from 'next/image'

interface UserAvatarProps {
  prenom?: string | null
  nom?: string | null
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
}

export function UserAvatar({
  prenom,
  nom,
  avatarUrl,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const initials =
    `${(prenom ?? '').trim().charAt(0)}${(nom ?? '').trim().charAt(0)}`
      .toUpperCase() || '?'

  if (avatarUrl) {
    return (
      <div
        className={`${sizeClasses[size]} relative rounded-full overflow-hidden ring-2 ring-white shadow-sm shrink-0 ${className}`}
      >
        <Image
          src={avatarUrl}
          alt={`${prenom ?? ''} ${nom ?? ''}`.trim() || 'Avatar'}
          fill
          className="object-cover"
          sizes="112px"
        />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-white select-none shrink-0 shadow-sm ${className}`}
    >
      {initials}
    </div>
  )
}
