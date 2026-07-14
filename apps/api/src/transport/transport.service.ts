import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);
const genAmb = customAlphabet("0123456789", 3);

@Injectable()
export class TransportService {
  constructor(private prisma: PrismaService) {}

  // ─── Ambulances ─────────────────────────────────────────────────────────────

  async createAmbulance(data: any, organizationId: string) {
    return this.prisma.ambulance.create({
      data: {
        vehicleNumber: `AMB-${genAmb()}`,
        plateNumber: data.plateNumber,
        vehicleType: data.vehicleType ?? "Basic",
        driverName: data.driverName ?? null,
        driverPhone: data.driverPhone ?? null,
        currentLocation: data.currentLocation ?? null,
        organizationId,
      },
    });
  }

  async findAllAmbulances(organizationId: string, status?: string) {
    return this.prisma.ambulance.findMany({
      where: { organizationId, ...(status && { status: status as any }) },
      include: { transports: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { vehicleNumber: "asc" },
    });
  }

  async updateAmbulanceStatus(id: string, status: string, data: any, organizationId: string) {
    const amb = await this.prisma.ambulance.findFirst({ where: { id, organizationId } });
    if (!amb) throw new NotFoundException("Ambulance not found");
    return this.prisma.ambulance.update({
      where: { id },
      data: { status: status as any, driverName: data.driverName ?? undefined, driverPhone: data.driverPhone ?? undefined, currentLocation: data.currentLocation ?? undefined },
    });
  }

  // ─── Transports ─────────────────────────────────────────────────────────────

  async createTransport(data: any, organizationId: string) {
    return this.prisma.transport.create({
      data: {
        transportNumber: `TRP-${genId()}`,
        patientId: data.patientId ?? null,
        type: data.type ?? "EMERGENCY",
        pickupLocation: data.pickupLocation,
        destination: data.destination,
        patientCondition: data.patientCondition ?? null,
        notes: data.notes ?? null,
        organizationId,
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
  }

  async findAllTransports(organizationId: string, filters: { status?: string; type?: string }) {
    const where: any = { organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return this.prisma.transport.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        ambulance: { select: { vehicleNumber: true, plateNumber: true, driverName: true } },
      },
      orderBy: { requestedAt: "desc" },
    });
  }

  async findOneTransport(id: string, organizationId: string) {
    const record = await this.prisma.transport.findFirst({
      where: { id, organizationId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        ambulance: { select: { vehicleNumber: true, plateNumber: true, driverName: true, driverPhone: true } },
      },
    });
    if (!record) throw new NotFoundException("Transport request not found");
    return record;
  }

  async dispatch(id: string, ambulanceId: string, organizationId: string) {
    const transport = await this.findOneTransport(id, organizationId);
    if (!["REQUESTED", "ASSIGNED"].includes(transport.status)) {
      throw new BadRequestException("Transport cannot be dispatched in its current state");
    }

    const ambulance = await this.prisma.ambulance.findFirst({ where: { id: ambulanceId, organizationId } });
    if (!ambulance) throw new NotFoundException("Ambulance not found");
    if (ambulance.status !== "AVAILABLE") throw new BadRequestException("Ambulance is not available");

    const [updatedTransport] = await this.prisma.$transaction([
      this.prisma.transport.update({
        where: { id },
        data: { ambulanceId, status: "DISPATCHED", dispatchedAt: new Date() },
        include: { ambulance: { select: { vehicleNumber: true, plateNumber: true } }, patient: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.ambulance.update({ where: { id: ambulanceId }, data: { status: "DISPATCHED" } }),
    ]);
    return updatedTransport;
  }

  async updateTransportStatus(id: string, data: { status: string; notes?: string }, organizationId: string) {
    const transport = await this.findOneTransport(id, organizationId);

    const now = new Date();
    const updates: any = { status: data.status, notes: data.notes ?? undefined };

    if (data.status === "AT_SCENE") updates.arrivedAt = now;
    if (data.status === "COMPLETED") {
      updates.completedAt = now;
      if (transport.ambulanceId) {
        await this.prisma.ambulance.update({ where: { id: transport.ambulanceId }, data: { status: "AVAILABLE" } });
      }
    }
    if (data.status === "CANCELLED" && transport.ambulanceId) {
      await this.prisma.ambulance.update({ where: { id: transport.ambulanceId }, data: { status: "AVAILABLE" } });
    }

    return this.prisma.transport.update({
      where: { id },
      data: updates,
      include: { ambulance: { select: { vehicleNumber: true, plateNumber: true } }, patient: { select: { firstName: true, lastName: true } } },
    });
  }

  async getSummary(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [availableAmbulances, totalAmbulances, activeTransports, todayTotal, emergency] = await Promise.all([
      this.prisma.ambulance.count({ where: { organizationId, status: "AVAILABLE" } }),
      this.prisma.ambulance.count({ where: { organizationId } }),
      this.prisma.transport.count({ where: { organizationId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      this.prisma.transport.count({ where: { organizationId, requestedAt: { gte: today, lt: tomorrow } } }),
      this.prisma.transport.count({ where: { organizationId, type: "EMERGENCY", requestedAt: { gte: today, lt: tomorrow } } }),
    ]);

    return { availableAmbulances, totalAmbulances, activeTransports, todayTotal, emergency };
  }
}
