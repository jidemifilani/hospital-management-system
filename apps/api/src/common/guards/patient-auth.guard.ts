import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Accepts only a patient's portal token, never a staff one. */
@Injectable()
export class PatientAuthGuard extends AuthGuard("patient-jwt") {}
