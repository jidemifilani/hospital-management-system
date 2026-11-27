import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  dailyKey,
  hourlyKey,
  JobGuardService,
} from "../common/scheduling/job-guard.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private jobs: JobGuardService,
  ) {}

  /** Run every hour on the hour — finds appointments 24h and 1h away and sends reminders */
  @Cron(CronExpression.EVERY_HOUR)
  async sendAppointmentReminders() {
    // Hourly key: the same hour must not send a patient two reminders.
    await this.jobs.runOnce("appointment-reminders", hourlyKey(), () => this.sendRemindersNow());
  }

  async sendRemindersNow() {
    const now = new Date();

    const windows = [
      { label: "24h", from: addMinutes(now, 23 * 60), to: addMinutes(now, 25 * 60) },
      { label: "1h",  from: addMinutes(now, 50),       to: addMinutes(now, 70) },
    ];

    for (const window of windows) {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          deletedAt: null,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          scheduledAt: { gte: window.from, lte: window.to },
          reminderSentAt: null,
        },
        select: {
          id: true,
          scheduledAt: true,
          patient: { select: { firstName: true, lastName: true, phone: true, email: true } },
          doctor: { select: { firstName: true, lastName: true } },
        },
      });

      this.logger.log(`[${window.label} reminder] Found ${appointments.length} appointments`);

      for (const appt of appointments) {
        try {
          await this.notifications.handleAppointmentReminder({
            patientPhone: appt.patient.phone,
            patientEmail: appt.patient.email ?? undefined,
            patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
            doctorName: appt.doctor
              ? `${appt.doctor.firstName} ${appt.doctor.lastName}`
              : "your doctor",
            scheduledAt: appt.scheduledAt,
            appointmentId: appt.id,
          });

          await this.prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderSentAt: new Date() },
          });
        } catch (err) {
          this.logger.error(`Reminder failed for appointment ${appt.id}`, err);
        }
      }
    }
  }

  /** Midnight daily — mark overdue invoices */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueInvoices() {
    await this.jobs.runOnce("mark-overdue-invoices", dailyKey(), () => this.markOverdueNow());
  }

  async markOverdueNow() {
    const result = await this.prisma.invoice.updateMany({
      where: {
        status: { in: ["ISSUED", "PARTIALLY_PAID"] },
        dueDate: { lt: new Date() },
        deletedAt: null,
      },
      data: { status: "OVERDUE" },
    });
    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} invoices as OVERDUE`);
    }
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
