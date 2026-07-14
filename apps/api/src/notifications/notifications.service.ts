import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import * as nodemailer from "nodemailer";
import axios from "axios";

export interface NotificationPayload {
  to: string;
  subject?: string;
  body: string;
  channel: "email" | "sms" | "push";
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailer: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");

    if (host && user && pass) {
      this.mailer = nodemailer.createTransport({
        host,
        port: this.config.get<number>("SMTP_PORT", 587),
        secure: false,
        auth: { user, pass },
      });
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    try {
      if (payload.channel === "email") {
        await this.sendEmail(payload);
      } else if (payload.channel === "sms") {
        await this.sendSms(payload);
      }
    } catch (err) {
      this.logger.error(`Notification failed [${payload.channel}] → ${payload.to}`, err);
    }
  }

  private async sendEmail(payload: NotificationPayload): Promise<void> {
    if (!this.mailer) {
      this.logger.warn(`Email not configured — skipping: ${payload.subject}`);
      return;
    }

    const from = this.config.get<string>("EMAIL_FROM", "no-reply@caresync.ng");
    await this.mailer.sendMail({
      from: `CareSync HMS <${from}>`,
      to: payload.to,
      subject: payload.subject ?? "CareSync HMS Notification",
      text: payload.body,
      html: this.buildHtmlEmail(payload.subject ?? "CareSync HMS Notification", payload.body),
    });

    this.logger.log(`Email sent → ${payload.to}: ${payload.subject}`);
  }

  private async sendSms(payload: NotificationPayload): Promise<void> {
    const apiKey = this.config.get<string>("TERMII_API_KEY");
    if (!apiKey) {
      this.logger.warn(`Termii not configured — skipping SMS to ${payload.to}`);
      return;
    }

    await axios.post("https://v3.api.termii.com/api/sms/send", {
      to: payload.to,
      from: this.config.get<string>("TERMII_SENDER_ID", "CareSync"),
      sms: payload.body,
      type: "plain",
      channel: "generic",
      api_key: apiKey,
    });

    this.logger.log(`SMS sent → ${payload.to}`);
  }

  private buildHtmlEmail(subject: string, body: string): string {
    const lines = body.split("\n").map((l) => `<p style="margin:0 0 12px">${l}</p>`).join("");
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#0f172a;padding:20px 24px">
      <h1 style="color:#fff;margin:0;font-size:18px">CareSync HMS</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b">${subject}</h2>
      <div style="color:#475569;font-size:14px;line-height:1.6">${lines}</div>
    </div>
    <div style="background:#f8fafc;padding:12px 24px;text-align:center">
      <p style="margin:0;font-size:11px;color:#94a3b8">CareSync Hospital Management System · Do not reply to this email</p>
    </div>
  </div>
</body>
</html>`;
  }

  @OnEvent("appointment.reminder")
  async handleAppointmentReminder(data: {
    patientPhone: string;
    patientEmail?: string;
    patientName: string;
    doctorName: string;
    scheduledAt: Date;
    appointmentId: string;
  }) {
    const time = data.scheduledAt.toLocaleString("en-NG", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    });

    await this.send({
      to: data.patientPhone,
      body: `Hi ${data.patientName}, reminder: appointment with Dr. ${data.doctorName} on ${time}. CareSync HMS.`,
      channel: "sms",
      metadata: { appointmentId: data.appointmentId },
    });

    if (data.patientEmail) {
      await this.send({
        to: data.patientEmail,
        subject: "Appointment Reminder — CareSync HMS",
        body: `Dear ${data.patientName},\n\nThis is a reminder that you have an appointment with Dr. ${data.doctorName} scheduled for ${time}.\n\nPlease arrive 10 minutes early. If you need to reschedule, contact us as soon as possible.\n\nThank you,\nCareSync HMS`,
        channel: "email",
        metadata: { appointmentId: data.appointmentId },
      });
    }
  }

  @OnEvent("user.created")
  async handleUserCreated(data: { email: string; firstName: string; tempPassword?: string }) {
    await this.send({
      to: data.email,
      subject: "Welcome to CareSync HMS",
      body: `Dear ${data.firstName},\n\nYour CareSync HMS account has been created.\n\n${data.tempPassword ? `Your temporary password is: ${data.tempPassword}\n\nPlease change it on first login.` : "Please contact your administrator for login details."}\n\nCareSync HMS`,
      channel: "email",
    });
  }

  @OnEvent("invoice.created")
  async handleInvoiceCreated(data: {
    patientPhone: string;
    patientEmail?: string;
    patientName: string;
    invoiceNumber: string;
    total: number;
    paymentLink?: string;
  }) {
    const amount = data.total.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

    await this.send({
      to: data.patientPhone,
      body: `Invoice ${data.invoiceNumber} for ${amount} has been raised. ${data.paymentLink ? `Pay online: ${data.paymentLink}` : "Please visit the hospital to make payment."} - CareSync HMS`,
      channel: "sms",
    });

    if (data.patientEmail) {
      await this.send({
        to: data.patientEmail,
        subject: `Invoice ${data.invoiceNumber} — CareSync HMS`,
        body: `Dear ${data.patientName},\n\nAn invoice (${data.invoiceNumber}) for ${amount} has been raised for your account.\n\n${data.paymentLink ? `You can pay online at: ${data.paymentLink}` : "Please visit the hospital billing desk to make payment."}\n\nThank you,\nCareSync HMS`,
        channel: "email",
      });
    }
  }
}
