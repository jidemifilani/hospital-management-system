import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(phone: string, dateOfBirth: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { phone, deletedAt: null },
      select: {
        id: true, mrn: true, firstName: true, lastName: true,
        dateOfBirth: true, gender: true, email: true, phone: true,
        organizationId: true,
      },
    });

    if (!patient) throw new UnauthorizedException("No patient found with this phone number");

    const dob = new Date(patient.dateOfBirth).toISOString().split("T")[0];
    const provided = new Date(dateOfBirth).toISOString().split("T")[0];
    if (dob !== provided) throw new UnauthorizedException("Date of birth does not match");

    const token = this.jwt.sign(
      { sub: patient.id, role: "PATIENT", organizationId: patient.organizationId },
      { secret: this.config.get("JWT_ACCESS_SECRET"), expiresIn: "7d" },
    );

    return {
      token,
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        phone: patient.phone,
        gender: patient.gender,
      },
    };
  }

  async getProfile(patientId: string) {
    const p = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: {
        id: true, mrn: true, firstName: true, lastName: true,
        dateOfBirth: true, gender: true, email: true, phone: true,
        address: true, state: true, bloodGroup: true, allergies: true,
        nhisNumber: true, emergencyContactName: true,
        emergencyContactPhone: true, emergencyContactRelation: true,
        createdAt: true,
      },
    });
    if (!p) throw new NotFoundException("Patient not found");
    return p;
  }

  async getAppointments(patientId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = { patientId, deletedAt: null as null };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: "desc" },
        select: {
          id: true, scheduledAt: true, durationMinutes: true,
          type: true, status: true, chiefComplaint: true,
          isTelemedicine: true, meetingUrl: true,
          doctor: { select: { firstName: true, lastName: true, specialization: true } },
          department: { select: { name: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getLabResults(patientId: string) {
    return this.prisma.labOrder.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, orderNumber: true, status: true, priority: true,
        sampleType: true, clinicalInfo: true, createdAt: true,
        requestedBy: { select: { firstName: true, lastName: true } },
        results: {
          select: {
            id: true, testName: true, result: true, unit: true,
            normalRange: true, isAbnormal: true, isCritical: true, resultedAt: true,
          },
        },
      },
    });
  }

  async getPrescriptions(patientId: string) {
    return this.prisma.prescription.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, prescriptionNo: true, status: true, notes: true, createdAt: true,
        prescribedBy: { select: { firstName: true, lastName: true } },
        items: {
          select: {
            id: true, dosage: true, frequency: true,
            duration: true, instructions: true, dispensedQty: true,
            drugItem: { select: { name: true, genericName: true } },
          },
        },
      },
    });
  }

  async getInvoices(patientId: string) {
    return this.prisma.invoice.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, invoiceNumber: true, status: true,
        total: true, amountPaid: true, dueDate: true, createdAt: true,
        items: { select: { description: true, quantity: true, unitPrice: true, total: true } },
        payments: { select: { amount: true, method: true, paidAt: true } },
      },
    });
  }

  async getEmrSummary(patientId: string) {
    const [vitalSigns, diagnoses, notes] = await Promise.all([
      this.prisma.vitalSigns.findFirst({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
        select: {
          systolicBP: true, diastolicBP: true,
          heartRate: true, temperature: true, oxygenSaturation: true,
          weight: true, height: true, recordedAt: true,
        },
      }),
      this.prisma.diagnosis.findMany({
        where: { patientId },
        orderBy: { diagnosedAt: "desc" },
        take: 10,
        select: { icdCode: true, description: true, status: true, diagnosedAt: true },
      }),
      this.prisma.clinicalNote.findMany({
        where: { patientId, deletedAt: null, noteType: "DISCHARGE" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          noteType: true, subjective: true, plan: true, createdAt: true,
          author: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return { latestVitals: vitalSigns, diagnoses, recentNotes: notes };
  }
}
