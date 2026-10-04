import { createSign, createVerify, createHash, randomUUID } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Prisma, StatutAlerte, StatutConfirmationSoBAPS } from '@medihelm/database'
import { PrismaService } from '../../database/prisma.service'
import type {
  CreateDpmedAlertDto,
  CreateSoBapsReceiptDto,
  CreateSurveillanceDto,
  DciSheetDto,
  InstitutionListQueryDto,
  UpdateDciSheetDto,
  UpdateDpmedAlertDto,
  UpdateSoBapsReceiptDto,
  UpdateSurveillanceDto,
} from './institutionnel.dto'

const SAFE_INSTITUTIONAL_PHARMACY = { id: true, nom: true, ville: true } as const

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return []
  }
}

function getSignatureKeys(): { privateKey: string; publicKey: string } {
  const privateRaw = process.env.DPMED_PRIVATE_KEY
  const publicRaw = process.env.DPMED_PUBLIC_KEY
  if (!privateRaw || privateRaw.trim().length < 80 || !publicRaw || publicRaw.trim().length < 80) {
    throw new ServiceUnavailableException('La clé de signature DPMED n’est pas configurée; l’alerte reste en brouillon')
  }
  return { privateKey: privateRaw.replace(/\\n/g, '\n'), publicKey: publicRaw.replace(/\\n/g, '\n') }
}

function getReceptionLines(input: CreateSoBapsReceiptDto | UpdateSoBapsReceiptDto) {
  if (!input.lignes) return undefined
  const ecarts = input.lignes
    .filter((line) => line.quantiteAttendue !== line.quantiteRecue)
    .map((line) => ({
      dci: line.dci,
      numeroLot: line.numeroLot,
      quantiteAttendue: line.quantiteAttendue,
      quantiteRecue: line.quantiteRecue,
      motif: line.motifEcart ?? null,
    }))
  return { lines: input.lignes, discrepancies: ecarts }
}

@Injectable()
export class InstitutionalService {
  constructor(private readonly prisma: PrismaService) {}

  async getDpmedDashboard() {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const [pharmacies, scores, alertesActives, signalementsMois] = await Promise.all([
      this.prisma.pharmacie.count({ where: { actif: true } }),
      this.prisma.scoreConformite.findMany({
        orderBy: { dateCalcul: 'desc' },
        distinct: ['pharmacieId'],
        select: { pharmacieId: true, scoreTotal: true },
        take: 1000,
      }),
      this.prisma.alerteDPMED.count({ where: { statut: StatutAlerte.EN_DIFFUSION } }),
      this.prisma.signalementEI.count({ where: { createdAt: { gte: monthStart } } }),
    ])
    const moyenne = scores.length
      ? Math.round(scores.reduce((total, entry) => total + entry.scoreTotal, 0) / scores.length)
      : null
    return {
      data: {
        officinesActives: pharmacies,
        scoreMoyen: moyenne,
        alertesActives,
        signalementsEIduMois: signalementsMois,
        diffusionExterne: 'NON_CONFIGUREE',
      },
    }
  }

  async listDpmedAlerts(query: InstitutionListQueryDto) {
    const where = { statut: { not: StatutAlerte.ANNULEE } }
    const [data, total] = await Promise.all([
      this.prisma.alerteDPMED.findMany({
        where,
        orderBy: { dateEmissionDPMED: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { diffusions: true } } },
      }),
      this.prisma.alerteDPMED.count({ where }),
    ])
    return {
      data: data.map(({ _count, ...alert }) => ({ ...alert, officinesCiblees: _count.diffusions })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    }
  }

  async getDpmedAlert(id: string) {
    const alert = await this.prisma.alerteDPMED.findUnique({
      where: { id },
      include: {
        diffusions: {
          orderBy: { createdAt: 'asc' },
          include: { pharmacie: { select: SAFE_INSTITUTIONAL_PHARMACY } },
        },
      },
    })
    if (!alert) throw new NotFoundException('Alerte introuvable')
    return { data: alert }
  }

  async createDpmedAlert(input: CreateDpmedAlertDto) {
    const referenceOfficielle = `DPMED-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`
    const alert = await this.prisma.alerteDPMED.create({
      data: {
        referenceOfficielle,
        titre: input.titre,
        typeAlerte: input.typeAlerte,
        niveauUrgence: input.niveauUrgence,
        dciConcernee: input.dciConcernee,
        lotsCibles: [...new Set(input.lotsCibles.map((lot) => lot.trim()).filter(Boolean))],
        description: input.description,
        dateEmissionDPMED: new Date(),
        statut: StatutAlerte.BROUILLON,
      },
    })
    return { data: alert }
  }

  async updateDpmedAlert(id: string, input: UpdateDpmedAlertDto) {
    const existing = await this.prisma.alerteDPMED.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Alerte introuvable')
    if (existing.statut !== StatutAlerte.BROUILLON) {
      throw new ConflictException('Seule une alerte en brouillon peut être modifiée')
    }
    const result = await this.prisma.alerteDPMED.updateMany({
      where: { id, statut: StatutAlerte.BROUILLON },
      data: {
        ...input,
        lotsCibles: input.lotsCibles
          ? [...new Set(input.lotsCibles.map((lot) => lot.trim()).filter(Boolean))]
          : undefined,
      },
    })
    if (!result.count) throw new ConflictException('L’alerte a été publiée ou modifiée simultanément')
    return { data: await this.prisma.alerteDPMED.findUnique({ where: { id } }) }
  }

  async cancelDpmedAlert(id: string) {
    const existing = await this.prisma.alerteDPMED.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Alerte introuvable')
    if (existing.statut !== StatutAlerte.BROUILLON) {
      throw new ConflictException('Une alerte publiée ne peut pas être supprimée via cet endpoint')
    }
    const result = await this.prisma.alerteDPMED.updateMany({
      where: { id, statut: StatutAlerte.BROUILLON },
      data: { statut: StatutAlerte.ANNULEE },
    })
    if (!result.count) throw new ConflictException('L’alerte a été publiée ou modifiée simultanément')
    return { data: await this.prisma.alerteDPMED.findUnique({ where: { id } }) }
  }

  async publishDpmedAlert(id: string) {
    const existing = await this.prisma.alerteDPMED.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Alerte introuvable')
    if (existing.statut !== StatutAlerte.BROUILLON) {
      throw new ConflictException('Seule une alerte en brouillon peut être publiée')
    }

    const { privateKey, publicKey } = getSignatureKeys()
    const canonicalPayload = JSON.stringify({
      referenceOfficielle: existing.referenceOfficielle,
      titre: existing.titre,
      typeAlerte: existing.typeAlerte,
      niveauUrgence: existing.niveauUrgence,
      dciConcernee: existing.dciConcernee,
      lotsCibles: existing.lotsCibles,
      description: existing.description,
      dateEmissionDPMED: existing.dateEmissionDPMED.toISOString(),
    })
    let signatureNumerique: string
    try {
      const signer = createSign('RSA-SHA256')
      signer.update(canonicalPayload)
      signer.end()
      signatureNumerique = signer.sign(privateKey, 'base64')
      const verifier = createVerify('RSA-SHA256')
      verifier.update(canonicalPayload)
      verifier.end()
      if (!verifier.verify(publicKey, signatureNumerique, 'base64')) {
        throw new Error('RSA signature verification failed')
      }
    } catch {
      throw new ServiceUnavailableException('La paire de clés RSA DPMED est invalide ou incohérente; l’alerte reste en brouillon')
    }

    const pharmacies = existing.lotsCibles.length
      ? await this.prisma.lot.findMany({
          where: {
            numeroLot: { in: existing.lotsCibles },
            quantite: { gt: 0 },
            dateExpiration: { gt: new Date() },
            pharmacie: { actif: true },
          },
          select: { pharmacieId: true },
          distinct: ['pharmacieId'],
        })
      : await this.prisma.pharmacie.findMany({ where: { actif: true }, select: { id: true } })
    const targets = pharmacies.map((item) => 'pharmacieId' in item ? item.pharmacieId : item.id)
    const publishedAt = new Date()
    const alert = await this.prisma.$transaction(async (tx) => {
      const updatedCount = await tx.alerteDPMED.updateMany({
        where: { id, statut: StatutAlerte.BROUILLON },
        data: { signatureNumerique, statut: StatutAlerte.EN_DIFFUSION, datePublication: publishedAt },
      })
      if (!updatedCount.count) throw new ConflictException('L’alerte a été publiée ou modifiée simultanément')
      if (targets.length) {
        await tx.diffusionAlerte.createMany({
          data: targets.map((pharmacieId) => ({ alerteId: id, pharmacieId })),
          skipDuplicates: true,
        })
      }
      return tx.alerteDPMED.findUnique({ where: { id } })
    })
    return {
      data: alert,
      meta: {
        notificationsEnAttente: targets.length,
        diffusionExterne: 'NON_CONFIGUREE',
        message: 'Signature vérifiée et cibles enregistrées; aucun push/SMS n’est envoyé tant que les fournisseurs et le worker de diffusion ne sont pas configurés.',
      },
    }
  }

  async listDpmedSignalements(query: InstitutionListQueryDto) {
    const [items, total] = await Promise.all([
      this.prisma.signalementEI.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          pharmacieId: true,
          dciConcernee: true,
          gravite: true,
          dateDebut: true,
          statutEnvoi: true,
          refDPMED: true,
          createdAt: true,
        },
      }),
      this.prisma.signalementEI.count(),
    ])
    const data = items.map((signalement) => ({
      id: signalement.id,
      dciConcernee: signalement.dciConcernee,
      gravite: signalement.gravite,
      dateDebut: signalement.dateDebut,
      statutEnvoi: signalement.statutEnvoi,
      refDPMED: signalement.refDPMED,
      createdAt: signalement.createdAt,
      referenceOfficineAnonyme: `OFF-${createHash('sha256').update(signalement.pharmacieId).digest('hex').slice(0, 10).toUpperCase()}`,
    }))
    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        narratifClinique: 'NON_EXPOSE_SANS_PIPELINE_ANONYMISATION',
      },
    }
  }

  async getDpmedCompliance(query: InstitutionListQueryDto) {
    const [items, total] = await Promise.all([
      this.prisma.scoreConformite.findMany({
        orderBy: { dateCalcul: 'desc' },
        distinct: ['pharmacieId'],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { pharmacie: { select: SAFE_INSTITUTIONAL_PHARMACY } },
      }),
      this.prisma.pharmacie.count({ where: { actif: true } }),
    ])
    return {
      data: items.map((score) => ({
        officine: score.pharmacie,
        scoreTotal: score.scoreTotal,
        scoreRegistreStup: score.scoreRegistreStup,
        scoreAlerteDPMED: score.scoreAlerteDPMED,
        scoreDocuments: score.scoreDocuments,
        scorePharmacovigilance: score.scorePharmacovigilance,
        scoreDestructions: score.scoreDestructions,
        certificationDPMED: score.certificationDPMED,
        dateCalcul: score.dateCalcul,
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    }
  }

  async listSurveillance(query: InstitutionListQueryDto) {
    const where = { statut: { not: 'ARCHIVE' } }
    const [data, total] = await Promise.all([
      this.prisma.medicamentSurveillance.findMany({
        where,
        orderBy: { dateEmission: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.medicamentSurveillance.count({ where }),
    ])
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } }
  }

  async getSurveillance(id: string) {
    const data = await this.prisma.medicamentSurveillance.findUnique({ where: { id } })
    if (!data || data.statut === 'ARCHIVE') throw new NotFoundException('Médicament sous surveillance introuvable')
    return { data }
  }

  async createSurveillance(input: CreateSurveillanceDto) {
    const data = await this.prisma.medicamentSurveillance.create({
      data: {
        dci: input.dci.trim(),
        nomCommercial: input.nomCommercial?.trim(),
        typeSurveillance: input.typeSurveillance,
        description: input.description,
        dateEmission: input.dateEmission ? new Date(input.dateEmission) : new Date(),
        niveauRisque: input.niveauRisque,
        statut: input.statut ?? 'ACTIVE',
        sourceAlerte: 'DPMED',
      },
    })
    return { data }
  }

  async updateSurveillance(id: string, input: UpdateSurveillanceDto) {
    const existing = await this.prisma.medicamentSurveillance.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Médicament sous surveillance introuvable')
    const data = await this.prisma.medicamentSurveillance.update({
      where: { id },
      data: {
        ...input,
        dateEmission: input.dateEmission ? new Date(input.dateEmission) : undefined,
      },
    })
    return { data }
  }

  async archiveSurveillance(id: string) {
    const existing = await this.prisma.medicamentSurveillance.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Médicament sous surveillance introuvable')
    const data = await this.prisma.medicamentSurveillance.update({ where: { id }, data: { statut: 'ARCHIVE' } })
    return { data }
  }

  async listDciSheets(query: InstitutionListQueryDto) {
    const where = { actif: true }
    const [data, total] = await Promise.all([
      this.prisma.ficheDCI.findMany({
        where,
        orderBy: { dci: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ficheDCI.count({ where }),
    ])
    return {
      data: data.map(({ interactionsJson, effetsIndesirablesJson, ...sheet }) => ({
        ...sheet,
        interactions: safeParseJson(interactionsJson),
        effetsIndesirables: safeParseJson(effetsIndesirablesJson),
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    }
  }

  async getDciSheet(id: string) {
    const data = await this.prisma.ficheDCI.findUnique({ where: { id } })
    if (!data || !data.actif) throw new NotFoundException('Fiche DCI introuvable')
    const { interactionsJson, effetsIndesirablesJson, ...sheet } = data
    return { data: { ...sheet, interactions: safeParseJson(interactionsJson), effetsIndesirables: safeParseJson(effetsIndesirablesJson) } }
  }

  async createDciSheet(input: DciSheetDto) {
    try {
      const data = await this.prisma.ficheDCI.create({
        data: {
          dci: input.dci.trim(),
          classeTherapeutique: input.classeTherapeutique,
          mecanisme: input.mecanisme,
          indications: input.indications,
          posologie: input.posologie,
          contreIndications: input.contreIndications,
          interactionsJson: JSON.stringify(input.interactions ?? []),
          effetsIndesirablesJson: JSON.stringify(input.effetsIndesirables ?? []),
          conservation: input.conservation,
          source: input.source,
          actif: input.actif ?? true,
        },
      })
      return { data }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Une fiche existe déjà pour cette DCI')
      }
      throw error
    }
  }

  async updateDciSheet(id: string, input: UpdateDciSheetDto) {
    const existing = await this.prisma.ficheDCI.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Fiche DCI introuvable')
    try {
      const data = await this.prisma.ficheDCI.update({
        where: { id },
        data: {
          dci: input.dci?.trim(),
          classeTherapeutique: input.classeTherapeutique,
          mecanisme: input.mecanisme,
          indications: input.indications,
          posologie: input.posologie,
          contreIndications: input.contreIndications,
          interactionsJson: input.interactions === undefined ? undefined : JSON.stringify(input.interactions),
          effetsIndesirablesJson: input.effetsIndesirables === undefined ? undefined : JSON.stringify(input.effetsIndesirables),
          conservation: input.conservation,
          source: input.source,
          actif: input.actif,
        },
      })
      return { data }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Une fiche existe déjà pour cette DCI')
      }
      throw error
    }
  }

  async archiveDciSheet(id: string) {
    const existing = await this.prisma.ficheDCI.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Fiche DCI introuvable')
    const data = await this.prisma.ficheDCI.update({ where: { id }, data: { actif: false } })
    return { data }
  }

  async getSobapsDashboard() {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const where = { statut: { not: StatutConfirmationSoBAPS.ANNULEE }, dateLivraison: { gte: monthStart } }
    const [total, confirmees, enAttente, litiges, confirmations] = await Promise.all([
      this.prisma.confirmationReceptionSoBAPS.count({ where }),
      this.prisma.confirmationReceptionSoBAPS.count({ where: { ...where, statut: StatutConfirmationSoBAPS.CONFIRME } }),
      this.prisma.confirmationReceptionSoBAPS.count({ where: { ...where, statut: StatutConfirmationSoBAPS.EN_ATTENTE } }),
      this.prisma.confirmationReceptionSoBAPS.count({ where: { ...where, statut: StatutConfirmationSoBAPS.LITIGE } }),
      this.prisma.confirmationReceptionSoBAPS.findMany({
        where,
        select: { pharmacie: { select: { ville: true } } },
        take: 5000,
      }),
    ])
    const coverage = new Map<string, number>()
    for (const item of confirmations) {
      const ville = item.pharmacie.ville || 'Non renseignée'
      coverage.set(ville, (coverage.get(ville) ?? 0) + 1)
    }
    return {
      data: {
        livraisonsDuMois: total,
        confirmees,
        enAttente,
        litiges,
        tauxConfirmation: total ? Math.round((confirmees / total) * 100) : 0,
        couvertureParVille: [...coverage].map(([ville, count]) => ({ ville, confirmations: count })),
      },
    }
  }

  async listSobapsDeliveries(query: InstitutionListQueryDto, status?: StatutConfirmationSoBAPS) {
    const where: Prisma.ConfirmationReceptionSoBAPSWhereInput = {
      statut: status ?? { not: StatutConfirmationSoBAPS.ANNULEE },
    }
    const [items, total] = await Promise.all([
      this.prisma.confirmationReceptionSoBAPS.findMany({
        where,
        orderBy: { dateLivraison: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { pharmacie: { select: SAFE_INSTITUTIONAL_PHARMACY } },
      }),
      this.prisma.confirmationReceptionSoBAPS.count({ where }),
    ])
    const data = items.map(({ lignesJson, ecartsJson, ...item }) => ({
      ...item,
      lignes: safeParseJson(lignesJson),
      ecarts: safeParseJson(ecartsJson),
    }))
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } }
  }

  async listPharmacyReceipts(pharmacieId: string, query: InstitutionListQueryDto) {
    const where = { pharmacieId }
    const [items, total] = await Promise.all([
      this.prisma.confirmationReceptionSoBAPS.findMany({
        where,
        orderBy: { dateLivraison: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.confirmationReceptionSoBAPS.count({ where }),
    ])
    return {
      data: items.map(({ lignesJson, ecartsJson, ...item }) => ({
        ...item,
        lignes: safeParseJson(lignesJson),
        ecarts: safeParseJson(ecartsJson),
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    }
  }

  async getPharmacyReceipt(pharmacieId: string, id: string) {
    const item = await this.prisma.confirmationReceptionSoBAPS.findFirst({ where: { id, pharmacieId } })
    if (!item) throw new NotFoundException('Réception SoBAPS introuvable')
    const { lignesJson, ecartsJson, ...data } = item
    return { data: { ...data, lignes: safeParseJson(lignesJson), ecarts: safeParseJson(ecartsJson) } }
  }

  async createPharmacyReceipt(pharmacieId: string, input: CreateSoBapsReceiptDto) {
    const summary = getReceptionLines(input)
    if (!summary) throw new BadRequestException('Les lignes de réception sont requises')
    try {
      const item = await this.prisma.confirmationReceptionSoBAPS.create({
        data: {
          pharmacieId,
          referenceBL: input.referenceBL.trim(),
          dateLivraison: new Date(input.dateLivraison),
          statut: StatutConfirmationSoBAPS.EN_ATTENTE,
          lignesJson: JSON.stringify(summary.lines),
          ecartsJson: JSON.stringify(summary.discrepancies),
        },
      })
      return { data: item }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Cette référence de bon de livraison existe déjà pour cette officine')
      }
      throw error
    }
  }

  async updatePharmacyReceipt(pharmacieId: string, id: string, input: UpdateSoBapsReceiptDto) {
    const existing = await this.prisma.confirmationReceptionSoBAPS.findFirst({ where: { id, pharmacieId } })
    if (!existing) throw new NotFoundException('Réception SoBAPS introuvable')
    if (existing.statut !== StatutConfirmationSoBAPS.EN_ATTENTE) {
      throw new ConflictException('Seule une réception en attente peut être modifiée')
    }
    const summary = getReceptionLines(input)
    const updated = await this.prisma.confirmationReceptionSoBAPS.updateMany({
      where: { id, pharmacieId, statut: StatutConfirmationSoBAPS.EN_ATTENTE },
      data: {
        dateLivraison: input.dateLivraison ? new Date(input.dateLivraison) : undefined,
        lignesJson: summary ? JSON.stringify(summary.lines) : undefined,
        ecartsJson: summary ? JSON.stringify(summary.discrepancies) : undefined,
      },
    })
    if (!updated.count) throw new ConflictException('La réception a été confirmée, annulée ou modifiée simultanément')
    return this.getPharmacyReceipt(pharmacieId, id)
  }

  async confirmPharmacyReceipt(pharmacieId: string, id: string) {
    const existing = await this.prisma.confirmationReceptionSoBAPS.findFirst({ where: { id, pharmacieId } })
    if (!existing) throw new NotFoundException('Réception SoBAPS introuvable')
    if (existing.statut !== StatutConfirmationSoBAPS.EN_ATTENTE) {
      throw new ConflictException('Cette réception a déjà été confirmée ou signalée en litige')
    }
    const lines = safeParseJson(existing.lignesJson)
    if (!Array.isArray(lines) || lines.length === 0) throw new BadRequestException('Les lignes de réception sont invalides')
    const gaps = safeParseJson(existing.ecartsJson)
    const hasDiscrepancy = Array.isArray(gaps) && gaps.length > 0
    const updated = await this.prisma.confirmationReceptionSoBAPS.updateMany({
      where: { id, pharmacieId, statut: StatutConfirmationSoBAPS.EN_ATTENTE },
      data: {
        statut: hasDiscrepancy ? StatutConfirmationSoBAPS.LITIGE : StatutConfirmationSoBAPS.CONFIRME,
        confirmeLe: new Date(),
      },
    })
    if (!updated.count) throw new ConflictException('La réception a été confirmée ou modifiée simultanément')
    const item = await this.prisma.confirmationReceptionSoBAPS.findFirst({ where: { id, pharmacieId } })
    return {
      data: item,
      meta: {
        webhookSent: false,
        message: 'Réception enregistrée; aucune transmission externe n’est configurée.',
      },
    }
  }

  async cancelPharmacyReceipt(pharmacieId: string, id: string) {
    const existing = await this.prisma.confirmationReceptionSoBAPS.findFirst({ where: { id, pharmacieId } })
    if (!existing) throw new NotFoundException('Réception SoBAPS introuvable')
    if (existing.statut !== StatutConfirmationSoBAPS.EN_ATTENTE) {
      throw new ConflictException('Seule une réception en attente peut être annulée')
    }
    const result = await this.prisma.confirmationReceptionSoBAPS.updateMany({
      where: { id, pharmacieId, statut: StatutConfirmationSoBAPS.EN_ATTENTE },
      data: { statut: StatutConfirmationSoBAPS.ANNULEE },
    })
    if (!result.count) throw new ConflictException('La réception a été confirmée ou modifiée simultanément')
    return this.getPharmacyReceipt(pharmacieId, id)
  }
}
