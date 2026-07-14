import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as crypto from "crypto";

interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackVerifyData {
  status: string;
  reference: string;
  amount: number; // in kobo
  channel: string;
  paid_at: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";

  constructor(private config: ConfigService) {
    this.secretKey = this.config.get<string>("PAYSTACK_SECRET_KEY", "");
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async initializeTransaction(params: {
    email: string;
    amount: number; // naira — we convert to kobo
    reference: string;
    invoiceId: string;
    patientName: string;
    callbackUrl: string;
  }): Promise<PaystackInitResponse> {
    if (!this.secretKey) throw new BadRequestException("Paystack is not configured");

    const { data } = await axios.post(
      `${this.baseUrl}/transaction/initialize`,
      {
        email: params.email,
        amount: Math.round(params.amount * 100), // kobo
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: {
          invoice_id: params.invoiceId,
          patient_name: params.patientName,
        },
      },
      { headers: this.headers },
    );

    if (!data.status) throw new BadRequestException(data.message || "Paystack initialization failed");
    return data.data as PaystackInitResponse;
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyData> {
    const { data } = await axios.get(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: this.headers },
    );
    if (!data.status) throw new BadRequestException("Paystack verification failed");
    return data.data as PaystackVerifyData;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.secretKey) return false;
    const hash = crypto.createHmac("sha512", this.secretKey).update(body).digest("hex");
    return hash === signature;
  }
}
