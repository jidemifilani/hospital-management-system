import { PrismaClient, StaffRole, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // Organization
  const org = await prisma.organization.upsert({
    where: { slug: "caresync-demo" },
    update: {},
    create: {
      name: "CareSync General Hospital",
      slug: "caresync-demo",
      address: "1 Hospital Road, Victoria Island, Lagos",
      phone: "+234 800 CARESYNC",
      email: "admin@caresync.ng",
    },
  });

  // Departments
  const deptData = [
    { name: "Outpatient", code: "OPD" },
    { name: "Emergency", code: "EMG" },
    { name: "Inpatient / Wards", code: "IPD" },
    { name: "Laboratory", code: "LAB" },
    { name: "Radiology", code: "RAD" },
    { name: "Pharmacy", code: "PHR" },
    { name: "Surgery", code: "SRG" },
    { name: "Pediatrics", code: "PED" },
  ];

  const departments: Record<string, { id: string }> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { code_organizationId: { code: d.code, organizationId: org.id } },
      update: {},
      create: { ...d, organizationId: org.id },
    });
    departments[d.code] = dept;
  }

  // Super admin user
  const passwordHash = await bcrypt.hash("admin123456", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@hostital.ng" },
    update: { passwordHash },
    create: {
      email: "admin@hostital.ng",
      passwordHash,
      role: StaffRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });

  await prisma.staff.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      employeeId: "ADM-00000001",
      userId: adminUser.id,
      firstName: "System",
      lastName: "Administrator",
      phone: "+234 800 000 0001",
      departmentId: departments["OPD"]!.id,
      organizationId: org.id,
    },
  });

  // Sample doctor
  const doctorHash = await bcrypt.hash("Doctor@123456", 12);
  const doctorUser = await prisma.user.upsert({
    where: { email: "dr.adeyemi@caresync.ng" },
    update: {},
    create: {
      email: "dr.adeyemi@caresync.ng",
      passwordHash: doctorHash,
      role: StaffRole.DOCTOR,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });

  await prisma.staff.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      employeeId: "DOC-00000001",
      userId: doctorUser.id,
      firstName: "Chidi",
      lastName: "Adeyemi",
      phone: "+234 801 234 5678",
      specialization: "General Medicine",
      licenseNumber: "MDCN-12345",
      departmentId: departments["OPD"]!.id,
      organizationId: org.id,
    },
  });

  // Sample beds
  const bedDeptId = departments["IPD"]!.id;
  for (let i = 1; i <= 10; i++) {
    await prisma.bed.upsert({
      where: { bedNumber_departmentId: { bedNumber: `W${String(i).padStart(2, "0")}`, departmentId: bedDeptId } },
      update: {},
      create: {
        bedNumber: `W${String(i).padStart(2, "0")}`,
        ward: "General Ward",
        departmentId: bedDeptId,
      },
    });
  }

  console.log("✅  Seed complete");
  console.log("   Admin:  admin@hostital.ng  /  admin123456");
  console.log("   Doctor: dr.adeyemi@caresync.ng  /  Doctor@123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
