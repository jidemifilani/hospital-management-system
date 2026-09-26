import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EncountersService } from "../encounters/encounters.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

const APPOINTMENT_SELECT = {
  id: true,
  scheduledAt: true,
  durationMinutes: true,
  type: true,
  status: true,
  chiefComplaint: true,
  notes: true,
  isTelemedicine: true,
  meetingUrl: true,
  createdAt: true,
  patient: { select: { id: true, mrn: true, firstName: true, lastName: true, phone: true } },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialization: true,
    },
  },
  department: { select: { id: true, name: true } },
};

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private encounters: EncountersService,
  ) {}

  /**
   * Front-desk arrival. Opens the episode of care and moves the appointment on,
   * so the consultation fee and any subsequent orders bill themselves.
   */
  async checkIn(id: string, organizationId: string, staffId?: string | null) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        patientId: true,
        departmentId: true,
        doctorId: true,
        status: true,
        chiefComplaint: true,
        isTelemedicine: true,
      },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");
    if (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
      throw new BadRequestException(`Cannot check in a ${appointment.status.toLowerCase()} appointment`);
    }

    const existing = await this.prisma.encounter.findFirst({
      where: { appointmentId: id, organizationId, deletedAt: null },
      select: { id: true },
    });

    const encounter =
      existing ??
      (await this.encounters.create(
        {
          patientId: appointment.patientId,
          departmentId: appointment.departmentId,
          appointmentId: appointment.id,
          attendingDoctorId: appointment.doctorId,
          type: appointment.isTelemedicine ? "TELEMEDICINE" : "OUTPATIENT",
          chiefComplaint: appointment.chiefComplaint ?? undefined,
        },
        organizationId,
        staffId ?? null,
      ));

    await this.prisma.appointment.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    return this.prisma.encounter.findUnique({
      where: { id: encounter.id },
      include: {
        patient: { select: { id: true, mrn: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  async create(dto: CreateAppointmentDto, organizationId: string, createdById: string) {
    const scheduledAt = new Date(dto.scheduledAt);

    // Prevent double-booking: same doctor, overlapping time slot
    const duration = dto.durationMinutes ?? 30;
    const end = new Date(scheduledAt.getTime() + duration * 60_000);

    const clash = await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        organizationId,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        scheduledAt: { lt: end },
        AND: [
          {
            scheduledAt: {
              gte: new Date(scheduledAt.getTime() - 30 * 60_000),
            },
          },
        ],
      },
    });

    if (clash) {
      throw new ConflictException("Doctor has a conflicting appointment at this time");
    }

    return this.prisma.appointment.create({
      data: {
        ...dto,
        scheduledAt,
        durationMinutes: duration,
        organizationId,
        createdById,
      },
      select: APPOINTMENT_SELECT,
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters: {
      patientId?: string;
      doctorId?: string;
      departmentId?: string;
      status?: string;
      date?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const skip = (page - 1) * limit;

    // Date range filter: supports single date, from/to range, or both
    let scheduledAtFilter: Record<string, Date> | undefined;
    if (filters.from || filters.to) {
      scheduledAtFilter = {};
      if (filters.from) scheduledAtFilter.gte = new Date(`${filters.from}T00:00:00`);
      if (filters.to) scheduledAtFilter.lte = new Date(`${filters.to}T23:59:59`);
    } else if (filters.date) {
      const d = new Date(filters.date);
      scheduledAtFilter = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lt: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const where = {
      organizationId,
      deletedAt: null as null,
      ...(filters.patientId && { patientId: filters.patientId }),
      ...(filters.doctorId && { doctorId: filters.doctorId }),
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.status && Object.values(AppointmentStatus).includes(filters.status as AppointmentStatus) && { status: filters.status as AppointmentStatus }),
      ...(scheduledAtFilter && { scheduledAt: scheduledAtFilter }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
        select: APPOINTMENT_SELECT,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: APPOINTMENT_SELECT,
    });
    if (!appt) throw new NotFoundException("Appointment not found");
    return appt;
  }

  async update(id: string, dto: UpdateAppointmentDto, organizationId: string, updatedById: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!appt) throw new NotFoundException("Appointment not found");

    if (appt.status === "COMPLETED" || appt.status === "CANCELLED") {
      throw new BadRequestException(`Cannot update a ${appt.status.toLowerCase()} appointment`);
    }

    if (dto.status === "CANCELLED" && !dto.cancelReason) {
      throw new BadRequestException("Cancel reason is required");
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { ...dto, updatedById },
      select: APPOINTMENT_SELECT,
    });
  }

  async getTodayForDoctor(doctorId: string, organizationId: string) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    return this.prisma.appointment.findMany({
      where: {
        doctorId,
        organizationId,
        deletedAt: null,
        scheduledAt: { gte: start, lte: end },
      },
      orderBy: { scheduledAt: "asc" },
      select: APPOINTMENT_SELECT,
    });
  }
}
