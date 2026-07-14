import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genNum = customAlphabet("0123456789", 6);

const ORDER_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  orderedBy: { select: { id: true, firstName: true, lastName: true } },
  mealRecords: { orderBy: { date: "desc" as const }, take: 10 },
} as const;

@Injectable()
export class DietaryService {
  constructor(private prisma: PrismaService) {}

  async createOrder(data: {
    patientId: string; dietType: string; startDate?: string; endDate?: string;
    allergies?: string; instructions?: string;
  }, orderedById: string | undefined, organizationId: string) {
    return this.prisma.dietOrder.create({
      data: {
        orderNumber: `DIET-${genNum()}`,
        patientId: data.patientId,
        dietType: data.dietType,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        allergies: data.allergies,
        instructions: data.instructions,
        orderedById,
        organizationId,
      },
      include: ORDER_INCLUDE,
    });
  }

  async findAllOrders(organizationId: string, patientId?: string, status?: string) {
    return this.prisma.dietOrder.findMany({
      where: {
        organizationId,
        ...(patientId ? { patientId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOneOrder(id: string, organizationId: string) {
    const order = await this.prisma.dietOrder.findFirst({ where: { id, organizationId }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException("Diet order not found");
    return order;
  }

  async updateOrderStatus(id: string, status: string, organizationId: string) {
    const order = await this.prisma.dietOrder.findFirst({ where: { id, organizationId } });
    if (!order) throw new NotFoundException("Diet order not found");
    return this.prisma.dietOrder.update({ where: { id }, data: { status: status as any }, include: ORDER_INCLUDE });
  }

  async recordMeal(data: {
    dietOrderId: string; mealType: string; served?: boolean; consumed?: boolean; notes?: string; date?: string;
  }, organizationId: string) {
    const order = await this.prisma.dietOrder.findFirst({ where: { id: data.dietOrderId, organizationId } });
    if (!order) throw new NotFoundException("Diet order not found");
    return this.prisma.mealRecord.create({
      data: {
        dietOrderId: data.dietOrderId,
        mealType: data.mealType as any,
        served: data.served ?? true,
        consumed: data.consumed ?? false,
        notes: data.notes,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }

  async getTodayMeals(organizationId: string) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    return this.prisma.mealRecord.findMany({
      where: { date: { gte: dayStart, lte: dayEnd }, dietOrder: { organizationId, status: "ACTIVE" } },
      include: { dietOrder: { include: { patient: { select: { id: true, firstName: true, lastName: true, mrn: true } } } } },
      orderBy: { date: "asc" },
    });
  }

  async getSummary(organizationId: string) {
    const [active, total] = await Promise.all([
      this.prisma.dietOrder.count({ where: { organizationId, status: "ACTIVE" } }),
      this.prisma.dietOrder.count({ where: { organizationId } }),
    ]);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const mealsServedToday = await this.prisma.mealRecord.count({
      where: { served: true, date: { gte: dayStart }, dietOrder: { organizationId } },
    });
    return { active, total, mealsServedToday };
  }
}
