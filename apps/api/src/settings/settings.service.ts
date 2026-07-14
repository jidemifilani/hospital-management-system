import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { UpdateNotificationsDto } from "./dto/update-notifications.dto";

const ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  logoUrl: true,
  notificationSettings: true,
  createdAt: true,
  updatedAt: true,
} as const;

const DEFAULT_NOTIFICATION_SETTINGS = {
  email: {
    appointmentReminder: true,
    invoiceCreated: true,
    userCreated: true,
    labResultReady: true,
    leaveApproved: true,
  },
  sms: {
    appointmentReminder: true,
    invoiceCreated: true,
    userCreated: false,
    labResultReady: false,
    leaveApproved: false,
  },
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: ORG_SELECT,
    });
    if (!org) throw new NotFoundException("Organization not found");

    return {
      ...org,
      notificationSettings: (org.notificationSettings as object) ?? DEFAULT_NOTIFICATION_SETTINGS,
    };
  }

  async updateOrganization(organizationId: string, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
      select: ORG_SELECT,
    });
  }

  async updateNotifications(organizationId: string, dto: UpdateNotificationsDto) {
    const current = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { notificationSettings: true },
    });
    if (!current) throw new NotFoundException("Organization not found");

    const existing = (current.notificationSettings as any) ?? DEFAULT_NOTIFICATION_SETTINGS;
    const merged = {
      email: { ...existing.email, ...(dto.email ?? {}) },
      sms: { ...existing.sms, ...(dto.sms ?? {}) },
    };

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { notificationSettings: merged },
      select: { notificationSettings: true },
    });

    return { notificationSettings: updated.notificationSettings };
  }
}
