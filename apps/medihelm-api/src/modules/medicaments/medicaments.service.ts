import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@medihelm/database'
import { PrismaService } from '../../database/prisma.service'
import type { CreateMedicamentDto, MedicamentQueryDto, UpdateMedicamentDto } from './medicament.dto'

@Injectable()
export class MedicamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(pharmacieId: string, query: MedicamentQueryDto) {
    const where: Prisma.MedicamentWhereInput = { pharmacieId, actif: query.actif ?? true }
    if (query.dci) where.dci = { contains: query.dci.trim(), mode: 'insensitive' }
    if (query.nomCommercial) where.nomCommercial = { contains: query.nomCommercial.trim(), mode: 'insensitive' }
    if (query.forme) where.forme = query.forme
    if (query.search) {
      const search = query.search.trim()
      where.OR = [
        { dci: { contains: search, mode: 'insensitive' } },
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { dosage: { contains: search, mode: 'insensitive' } },
      ]
    }

    const include = { lots: { where: { pharmacieId }, orderBy: { dateExpiration: 'asc' as const } } }
    const orderBy: Prisma.MedicamentOrderByWithRelationInput = { [query.sortBy]: query.sortOrder }
    const skip = (query.page - 1) * query.pageSize
    const [data, total] = await Promise.all([
      this.prisma.medicament.findMany({ where, include, orderBy, skip, take: query.pageSize }),
      this.prisma.medicament.count({ where }),
    ])

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    }
  }

  async getById(pharmacieId: string, id: string) {
    const data = await this.prisma.medicament.findFirst({
      where: { id, pharmacieId },
      include: { lots: { where: { pharmacieId }, orderBy: { dateExpiration: 'asc' } } },
    })
    if (!data) throw new NotFoundException('Médicament introuvable')
    return { data }
  }

  async create(pharmacieId: string, input: CreateMedicamentDto) {
    const data = await this.prisma.medicament.create({
      data: { ...input, pharmacieId },
    })
    return { data }
  }

  async update(pharmacieId: string, id: string, input: UpdateMedicamentDto) {
    const data = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
    if (Object.keys(data).length === 0) throw new BadRequestException('Aucun champ à modifier')

    const result = await this.prisma.medicament.updateMany({
      where: { id, pharmacieId },
      data,
    })
    if (result.count === 0) throw new NotFoundException('Médicament introuvable')
    return this.getById(pharmacieId, id)
  }

  async archive(pharmacieId: string, id: string) {
    const result = await this.prisma.medicament.updateMany({
      where: { id, pharmacieId },
      data: { actif: false },
    })
    if (result.count === 0) throw new NotFoundException('Médicament introuvable')
    return { data: { id, actif: false } }
  }
}
