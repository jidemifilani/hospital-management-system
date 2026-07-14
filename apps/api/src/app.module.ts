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
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { TrainingModule } from "./training/training.module";
import { AlertsModule } from "./alerts/alerts.module";
import { HandoverModule } from "./handover/handover.module";
import { RehabModule } from "./rehab/rehab.module";
import { WardRoundsModule } from "./ward-rounds/ward-rounds.module";
import { ConsentModule } from "./consent/consent.module";
import { DischargeModule } from "./discharge/discharge.module";
import { SiteSettingsModule } from "./site-settings/site-settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),

    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
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
    MaintenanceModule,
    TrainingModule,
    AlertsModule,
    HandoverModule,
    RehabModule,
    WardRoundsModule,
    ConsentModule,
    DischargeModule,
    SiteSettingsModule,
  ],
})
export class AppModule {}
