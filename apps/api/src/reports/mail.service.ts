import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string;

  constructor(private config: ConfigService) {
    const host = config.get<string>("SMTP_HOST");
    const port = config.get<number>("SMTP_PORT", 587);
    const user = config.get<string>("SMTP_USER");
    const pass = config.get<string>("SMTP_PASS");
    this.from = config.get<string>("EMAIL_FROM", "no-reply@caresync.ng");

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
    } else {
      this.logger.warn("SMTP not fully configured — scheduled report emails will be skipped");
    }
  }

  async sendHtml(to: string[], subject: string, html: string): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email: ${err?.message}`);
      return false;
    }
  }
}
