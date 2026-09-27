import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(organizationId: string) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [
      totalPatients,
      appointmentsToday,
      availableBeds,
      activeEncounters,
      newPatientsThisMonth,
      appointmentStatusBreakdown,
      pendingLabOrders,
      pendingPrescriptions,
      outstandingInvoices,
      lowStockCount,
      admittedPatients,
      unbilledCharges,
    ] = await Promise.all([
      this.prisma.patient.count({ where: { organizationId, isActive: true, deletedAt: null } }),
      this.prisma.appointment.count({
        where: {
          organizationId,
          deletedAt: null,
          scheduledAt: { gte: todayStart, lt: todayEnd },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      }),
      this.prisma.bed.count({ where: { department: { organizationId }, isOccupied: false } }),
      // Real open episodes of care. This previously counted appointments with
      // status IN_PROGRESS, which missed every walk-in, triage arrival and
      // inpatient, and counted a booking rather than an episode.
      this.prisma.encounter.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ["ARRIVED", "TRIAGED", "IN_CONSULTATION", "OBSERVATION", "ADMITTED"] },
        },
      }),
      this.prisma.patient.count({
        where: {
          organizationId,
          deletedAt: null,
          createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        },
      }),
      this.prisma.appointment.groupBy({
        by: ["status"],
        where: {
          organizationId,
          deletedAt: null,
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
        _count: true,
      }),
      this.prisma.labOrder.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ["PENDING", "SAMPLE_COLLECTED", "PROCESSING"] },
        },
      }),
      this.prisma.prescription.count({
        where: { organizationId, deletedAt: null, status: "PENDING" },
      }),
      this.prisma.invoice.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        },
      }),
      // Was raw SQL against "DrugItem"/"DrugStock" with a deletedAt column —
      // none of which exist (the tables are drug_items/drug_stock). It threw on
      // every call and a .catch(() => 0) made the tile read zero forever.
      this.prisma.drugItem
        .findMany({
          where: { organizationId, isActive: true },
          select: {
            reorderLevel: true,
            stock: {
              where: { quantity: { gt: 0 }, expiresAt: { gt: new Date() } },
              select: { quantity: true },
            },
          },
        })
        .then(
          (drugs) =>
            drugs.filter(
              (d) => d.stock.reduce((sum, b) => sum + b.quantity, 0) <= d.reorderLevel,
            ).length,
        ),

      this.prisma.admission.count({ where: { organizationId, status: "ACTIVE" } }),

      this.prisma.charge.aggregate({
        where: { organizationId, isBilled: false, isVoided: false },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

    return {
      totalPatients,
      appointmentsToday,
      availableBeds,
      activeEncounters,
      newPatientsThisMonth,
      appointmentStatusBreakdown: Object.fromEntries(
        appointmentStatusBreakdown.map((s) => [s.status, s._count]),
      ),
      pendingLabOrders,
      pendingPrescriptions,
      outstandingInvoices,
      lowStockDrugs: Number(lowStockCount),
      admittedPatients,
      unbilledCharges: {
        count: unbilledCharges._count._all,
        total: unbilledCharges._sum.total?.toString() ?? "0",
      },
    };
  }

  async getRecentPatients(organizationId: string, limit = 8) {
    return this.prisma.patient.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        gender: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async getTodayAppointments(organizationId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      select: {
        id: true,
        scheduledAt: true,
        type: true,
        status: true,
        patient: { select: { mrn: true, firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
    });
  }

  async getBedOccupancy(organizationId: string) {
    const beds = await this.prisma.bed.groupBy({
      by: ["ward"],
      where: { department: { organizationId } },
      _count: { ward: true },
    });

    const occupied = await this.prisma.bed.groupBy({
      by: ["ward"],
      where: { department: { organizationId }, isOccupied: true },
      _count: { ward: true },
    });

    const occupiedMap = Object.fromEntries(occupied.map((b) => [b.ward, b._count.ward]));

    return beds.map((b) => ({
      ward: b.ward,
      total: b._count.ward,
      occupied: occupiedMap[b.ward] ?? 0,
      available: b._count.ward - (occupiedMap[b.ward] ?? 0),
    }));
  }

  async getReports(organizationId: string, months = 6) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    // Build monthly buckets
    const buckets: { year: number; month: number; label: string }[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
      buckets.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en-NG", { month: "short", year: "2-digit" }) });
    }

    const [patients, appointments, invoices] = await Promise.all([
      this.prisma.patient.findMany({
        where: { organizationId, deletedAt: null, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.appointment.findMany({
        where: { organizationId, deletedAt: null, scheduledAt: { gte: start } },
        select: { scheduledAt: true, status: true },
      }),
      this.prisma.invoice.findMany({
        where: { organizationId, deletedAt: null, createdAt: { gte: start } },
        select: { createdAt: true, total: true, amountPaid: true, status: true },
      }),
    ]);

    const byMonth = buckets.map(({ year, month, label }) => {
      const inMonth = (d: Date) => d.getFullYear() === year && d.getMonth() + 1 === month;

      const newPatients = patients.filter((p) => inMonth(p.createdAt)).length;
      const appts = appointments.filter((a) => inMonth(a.scheduledAt));
      const invs = invoices.filter((inv) => inMonth(inv.createdAt));
      const revenue = invs.reduce((s, inv) => s + Number(inv.amountPaid), 0);
      const billed = invs.reduce((s, inv) => s + Number(inv.total), 0);

      return {
        label,
        newPatients,
        totalAppointments: appts.length,
        completedAppointments: appts.filter((a) => a.status === "COMPLETED").length,
        revenue,
        billed,
      };
    });

    // Department-level appointment breakdown for the full period
    const deptBreakdown = await this.prisma.appointment.groupBy({
      by: ["departmentId"],
      where: { organizationId, deletedAt: null, scheduledAt: { gte: start } },
      _count: { departmentId: true },
      orderBy: { _count: { departmentId: "desc" } },
      take: 8,
    });

    const deptIds = deptBreakdown.map((d) => d.departmentId).filter(Boolean) as string[];
    const depts = await this.prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });
    const deptMap = Object.fromEntries(depts.map((d) => [d.id, d.name]));

    const byDepartment = deptBreakdown.map((d) => ({
      department: deptMap[d.departmentId ?? ""] ?? "Unknown",
      count: d._count.departmentId,
    }));

    // Invoice status summary
    const invoiceStatusRaw = await this.prisma.invoice.groupBy({
      by: ["status"],
      where: { organizationId, deletedAt: null, createdAt: { gte: start } },
      _count: { status: true },
      _sum: { total: true },
    });

    const invoiceStatus = invoiceStatusRaw.map((s) => ({
      status: s.status,
      count: s._count.status,
      total: Number(s._sum?.total ?? 0),
    }));

    return { byMonth, byDepartment, invoiceStatus };
  }
}
