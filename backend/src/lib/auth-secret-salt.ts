// ============================================================
// MediHelm — Sel de dérivation du secret NextAuth (module pur)
// ============================================================
// Partagé entre la version Node (auth-secret.ts) et la version
// Edge (auth-secret-edge.ts). Ne pas modifier sans invalider
// toutes les sessions émises avec l'ancienne valeur.
// ============================================================

export const DERIVATION_SALT = 'medihelm-auth:v1:'
