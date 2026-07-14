import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genNum = customAlphabet("0123456789", 6);

const PLAN_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  nurse: { select: { id: true, firstName: true, lastName: true } },
  tasks: true,
} as const;

@Injectable()
export class CarePlansService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    patientId: string; title: string; goals?: string; startDate?: string; endDate?: string; notes?: string;
    tasks?: Array<{ description: string; frequency?: string; dueAt?: string }>;
  }, nurseId: string, organizationId: string) {
    return this.prisma.carePlan.create({
      data: {
        planNumber: `CP-${genNum()}`,
        patientId: data.patientId,
        nurseId,
        title: data.title,
        goals: data.goals,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        notes: data.notes,
        organizationId,
        tasks: data.tasks ? {
          create: data.tasks.map((t) => ({
            description: t.description,
            frequency: t.frequency,
            dueAt: t.dueAt ? new Date(t.dueAt) : undefined,
          })),
        } : undefined,
      },
      include: PLAN_INCLUDE,
    });
  }

  async findAll(organizationId: string, patientId?: string, status?: string) {
    return this.prisma.carePlan.findMany({
      where: {
        organizationId,
        ...(patientId ? { patientId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: PLAN_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id, organizationId }, include: PLAN_INCLUDE });
    if (!plan) throw new NotFoundException("Care plan not found");
    return plan;
  }

  async updateStatus(id: string, status: string, organizationId: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id, organizationId } });
    if (!plan) throw new NotFoundException("Care plan not found");
    const update: any = { status };
    if (status === "COMPLETED") update.endDate = new Date();
    return this.prisma.carePlan.update({ where: { id }, data: update, include: PLAN_INCLUDE });
  }

  async addTask(planId: string, data: { description: string; frequency?: string; dueAt?: string }, organizationId: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id: planId, organizationId } });
    if (!plan) throw new NotFoundException("Care plan not found");
    return this.prisma.carePlanTask.create({
      data: {
        carePlanId: planId,
        description: data.description,
        frequency: data.frequency,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      },
    });
  }

  async updateTask(taskId: string, data: { status?: string; notes?: string }, organizationId: string) {
    const task = await this.prisma.carePlanTask.findFirst({
      where: { id: taskId },
      include: { carePlan: true },
    });
    if (!task || task.carePlan.organizationId !== organizationId) throw new NotFoundException("Task not found");

    const update: any = {};
    if (data.status) {
      update.status = data.status;
      if (data.status === "COMPLETED") update.completedAt = new Date();
    }
    if (data.notes !== undefined) update.notes = data.notes;

    return this.prisma.carePlanTask.update({ where: { id: taskId }, data: update });
  }

  async getSummary(organizationId: string) {
    const [active, completed, cancelled] = await Promise.all([
      this.prisma.carePlan.count({ where: { organizationId, status: "ACTIVE" } }),
      this.prisma.carePlan.count({ where: { organizationId, status: "COMPLETED" } }),
      this.prisma.carePlan.count({ where: { organizationId, status: "CANCELLED" } }),
    ]);
    const pendingTasks = await this.prisma.carePlanTask.count({
      where: { carePlan: { organizationId }, status: "PENDING" },
    });
    return { active, completed, cancelled, pendingTasks };
  }
}
