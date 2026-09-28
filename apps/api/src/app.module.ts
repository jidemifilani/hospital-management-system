import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PatientsModule } from "./patients/patients.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { StaffModule } from "./staff/staff.module";
import { DepartmentsModule } from "./departments/departments.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AuditModule } from "./audit/audit.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { HealthModule } from "./health/health.module";
import { EmrModule } from "./emr/emr.module";
import { BillingModule } from "./billing/billing.module";
import { LabModule } from "./lab/lab.module";
import { PharmacyModule } from "./pharmacy/pharmacy.module";
import { RosterModule } from "./roster/roster.module";
import { BedsModule } from "./beds/beds.module";
import { PortalModule } from "./portal/portal.module";
import { LeaveModule } from "./leave/leave.module";
import { RadiologyModule } from "./radiology/radiology.module";
import { ReferralsModule } from "./referrals/referrals.module";
import { SettingsModule } from "./settings/settings.module";
import { OpdQueueModule } from "./opd-queue/opd-queue.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { IncidentsModule } from "./incidents/incidents.module";
import { BloodBankModule } from "./blood-bank/blood-bank.module";
import { InsuranceModule } from "./insurance/insurance.module";
import { HmoModule } from "./hmo/hmo.module";
import { DocumentsModule } from "./documents/documents.module";
import { MortuaryModule } from "./mortuary/mortuary.module";
import { TheatreModule } from "./theatre/theatre.module";
import { CarePlansModule } from "./care-plans/care-plans.module";
import { ProcurementModule } from "./procurement/procurement.module";
import { AssetsModule } from "./assets/assets.module";
import { DietaryModule } from "./dietary/dietary.module";
import { TriageModule } from "./triage/triage.module";
import { PayrollModule } from "./payroll/payroll.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { VisitorsModule } from "./visitors/visitors.module";
import { AppraisalsModule } from "./appraisals/appraisals.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { TransportModule } from "./transport/transport.module";
import { MarModule } from "./mar/mar.module";
import { HelpdeskModule } from "./helpdesk/helpdesk.module";
import { TrainingModule } from "./training/training.module";
import { AlertsModule } from "./alerts/alerts.module";
import { HandoverModule } from "./handover/handover.module";
import { RehabModule } from "./rehab/rehab.module";
import { WardRoundsModule } from "./ward-rounds/ward-rounds.module";
import { ConsentModule } from "./consent/consent.module";
import { DischargeModule } from "./discharge/discharge.module";
import { SiteSettingsModule } from "./site-settings/site-settings.module";
import { ChargesModule } from "./charges/charges.module";
import { EncountersModule } from "./encounters/encounters.module";
import { AdmissionsModule } from "./admissions/admissions.module";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { ClinicalSafetyModule } from "./clinical-safety/clinical-safety.module";
import { AccountingModule } from "./accounting/accounting.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PosModule } from "./pos/pos.module";
import { APP_INTERCEPTOR, APP_GUARD } from "@nestjs/core";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { GlobalThrottlerGuard } from "./common/guards/global-throttler.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),

    // One global limit, generous enough for ordinary use — a dashboard load
    // alone fires half a dozen calls, and every staff login arrives from the
    // web server's single IP. Login is tightened separately, per account, by
    // LoginThrottlerGuard: a per-IP login limit would let one attacker lock
    // out the whole hospital.
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [{ name: "default", ttl: 60_000, limit: 300 }],
      }),
    }),

    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow("REDIS_URL") },
      }),
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    StaffModule,
    DepartmentsModule,
    DashboardModule,
    AuditModule,
    NotificationsModule,
    HealthModule,
    EmrModule,
    BillingModule,
    LabModule,
    PharmacyModule,
    RosterModule,
    BedsModule,
    PortalModule,
    LeaveModule,
    RadiologyModule,
    ReferralsModule,
    SettingsModule,
    OpdQueueModule,
    AttendanceModule,
    IncidentsModule,
    BloodBankModule,
    InsuranceModule,
    HmoModule,
    DocumentsModule,
    MortuaryModule,
    TheatreModule,
    CarePlansModule,
    ProcurementModule,
    AssetsModule,
    DietaryModule,
    TriageModule,
    PayrollModule,
    CertificatesModule,
    VisitorsModule,
    AppraisalsModule,
    FeedbackModule,
    TransportModule,
    MarModule,
    HelpdeskModule,
    TrainingModule,
    AlertsModule,
    HandoverModule,
    RehabModule,
    WardRoundsModule,
    ConsentModule,
    DischargeModule,
    SiteSettingsModule,
    ChargesModule,
    EncountersModule,
    AdmissionsModule,
    CatalogueModule,
    ClinicalSafetyModule,
    AccountingModule,
    InventoryModule,
    PosModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // ThrottlerModule was imported but its guard was never registered, so the
    // configured limits did nothing at all: 30 failed logins in a row were
    // accepted without pause. Registering it here is what makes them real.
    { provide: APP_GUARD, useClass: GlobalThrottlerGuard },
  ],
})
export class AppModule {}
