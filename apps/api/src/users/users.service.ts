import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as bcrypt from "bcrypt";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { HMS_CONFIG } from "@hms/config";

const genEmployeeId = customAlphabet("0123456789", 6);

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto, _createdById: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const dept = dto.departmentId
      // The id arrives from the request, so it is scoped: without this a user
      // could be filed under another organisation's department.
      ? await this.prisma.department.findFirst({
          where: { id: dto.departmentId, organizationId: dto.organizationId },
        })
      : await this.prisma.department.findFirst({
          where: { organizationId: dto.organizationId },
        });

    if (!dept) throw new NotFoundException("Department not found");

    const passwordHash = await bcrypt.hash(dto.password, HMS_CONFIG.password.saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        status: "ACTIVE",
        organizationId: dept.organizationId,
        staff: {
          create: {
            employeeId: `EMP${genEmployeeId()}`,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            specialization: dto.specialization,
            licenseNumber: dto.licenseNumber,
            departmentId: dept.id,
            organizationId: dept.organizationId,
          },
        },
      },
      include: {
        staff: { include: { department: true } },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, mfaSecret: _ms, mfaBackupCodes: _bc, ...safe } = user;

    this.events.emit("user.created", {
      staffId: user.staff?.id,
      name: `${dto.firstName} ${dto.lastName}`,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      password: dto.password,
    });

    return safe;
  }

  async findAll(organizationId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const searchFilter = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { staff: { firstName: { contains: search, mode: "insensitive" as const } } },
            { staff: { lastName: { contains: search, mode: "insensitive" as const } } },
            { staff: { employeeId: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const where = { organizationId, deletedAt: null, ...searchFilter };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              employeeId: true,
              specialization: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED", organizationId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!user) throw new NotFoundException("User not found");
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        mfaEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            employeeId: true,
            specialization: true,
            licenseNumber: true,
            qualifications: true,
            joiningDate: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async update(id: string, dto: UpdateUserDto, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        role: dto.role,
        ...(dto.departmentId && {
          staff: { update: { departmentId: dto.departmentId } },
        }),
      },
      select: { id: true, email: true, role: true, status: true, updatedAt: true },
    });
  }

  async resetPassword(id: string, newPassword: string, organizationId: string, actorId: string) {
    const user = await this.findOne(id, organizationId);

    // Only admins can reset other users' passwords; users cannot reset admins
    const actor = await this.prisma.user.findUniqueOrThrow({ where: { id: actorId } });
    if (!["SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(actor.role)) {
      throw new ForbiddenException("Only admins can reset passwords");
    }
    if (["SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(user.role) && actor.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Cannot reset admin passwords");
    }

    const passwordHash = await bcrypt.hash(newPassword, HMS_CONFIG.password.saltRounds);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id },
      data: { isRevoked: true },
    });
  }
}
