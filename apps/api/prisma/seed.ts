import { PrismaClient, StaffRole, UserStatus, ServiceCategory } from "@prisma/client";
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

  // ── Service catalogue — the price list every auto-charge reads from (NGN) ──
  const serviceData: {
    code: string;
    name: string;
    category: ServiceCategory;
    unitPrice: number;
    nhisPrice?: number;
    unit?: string;
  }[] = [
    // Consultation
    { code: "CONS-GEN",   name: "General Consultation",        category: "CONSULTATION", unitPrice: 10000, nhisPrice: 3000 },
    { code: "CONS-SPEC",  name: "Specialist Consultation",     category: "CONSULTATION", unitPrice: 25000, nhisPrice: 8000 },
    { code: "CONS-EMG",   name: "Emergency Consultation",      category: "CONSULTATION", unitPrice: 20000, nhisPrice: 6000 },
    { code: "CONS-FU",    name: "Follow-up Consultation",      category: "CONSULTATION", unitPrice: 6000,  nhisPrice: 2000 },
    { code: "CONS-TELE",  name: "Telemedicine Consultation",   category: "CONSULTATION", unitPrice: 8000 },

    // Laboratory
    { code: "LAB-FBC",    name: "Full Blood Count",            category: "LABORATORY", unitPrice: 8000,  nhisPrice: 3000 },
    { code: "LAB-MP",     name: "Malaria Parasite",            category: "LABORATORY", unitPrice: 3500,  nhisPrice: 1500 },
    { code: "LAB-BUE",    name: "Urea & Electrolytes",         category: "LABORATORY", unitPrice: 12000, nhisPrice: 5000 },
    { code: "LAB-LFT",    name: "Liver Function Test",         category: "LABORATORY", unitPrice: 15000, nhisPrice: 6000 },
    { code: "LAB-FBS",    name: "Fasting Blood Sugar",         category: "LABORATORY", unitPrice: 3000,  nhisPrice: 1200 },
    { code: "LAB-HBA1C",  name: "HbA1c",                       category: "LABORATORY", unitPrice: 15000, nhisPrice: 6000 },
    { code: "LAB-LIPID",  name: "Lipid Profile",               category: "LABORATORY", unitPrice: 15000, nhisPrice: 6000 },
    { code: "LAB-URIN",   name: "Urinalysis",                  category: "LABORATORY", unitPrice: 4000,  nhisPrice: 1500 },
    { code: "LAB-HIV",    name: "HIV Screening",               category: "LABORATORY", unitPrice: 5000,  nhisPrice: 0 },
    { code: "LAB-HEPB",   name: "Hepatitis B Screening",       category: "LABORATORY", unitPrice: 5000,  nhisPrice: 2000 },
    { code: "LAB-PT",     name: "Pregnancy Test",              category: "LABORATORY", unitPrice: 3000,  nhisPrice: 1200 },
    { code: "LAB-BG",     name: "Blood Grouping & Genotype",   category: "LABORATORY", unitPrice: 3500,  nhisPrice: 1500 },
    { code: "LAB-WIDAL",  name: "Widal Test",                  category: "LABORATORY", unitPrice: 4500,  nhisPrice: 2000 },
    { code: "LAB-MCS",    name: "Urine M/C/S",                 category: "LABORATORY", unitPrice: 12000, nhisPrice: 5000 },

    // Radiology
    { code: "RAD-XR-CHEST", name: "Chest X-Ray",               category: "RADIOLOGY", unitPrice: 15000,  nhisPrice: 6000 },
    { code: "RAD-XR-LIMB",  name: "Limb X-Ray",                category: "RADIOLOGY", unitPrice: 12000,  nhisPrice: 5000 },
    { code: "RAD-USS-ABD",  name: "Abdominal Ultrasound",      category: "RADIOLOGY", unitPrice: 20000,  nhisPrice: 8000 },
    { code: "RAD-USS-OBS",  name: "Obstetric Ultrasound",      category: "RADIOLOGY", unitPrice: 18000,  nhisPrice: 7000 },
    { code: "RAD-CT-HEAD",  name: "CT Scan — Head",            category: "RADIOLOGY", unitPrice: 85000,  nhisPrice: 40000 },
    { code: "RAD-CT-ABD",   name: "CT Scan — Abdomen",         category: "RADIOLOGY", unitPrice: 110000, nhisPrice: 55000 },
    { code: "RAD-MRI-BRAIN",name: "MRI — Brain",               category: "RADIOLOGY", unitPrice: 180000, nhisPrice: 90000 },
    { code: "RAD-ECHO",     name: "Echocardiogram",            category: "RADIOLOGY", unitPrice: 40000,  nhisPrice: 18000 },
    { code: "RAD-ECG",      name: "Electrocardiogram (ECG)",   category: "RADIOLOGY", unitPrice: 12000,  nhisPrice: 5000 },
    { code: "RAD-MAMMO",    name: "Mammogram",                 category: "RADIOLOGY", unitPrice: 45000,  nhisPrice: 20000 },

    // Bed charges (per night)
    { code: "BED-GEN",    name: "General Ward Bed",            category: "BED_CHARGE", unitPrice: 15000,  nhisPrice: 5000,  unit: "per night" },
    { code: "BED-SEMI",   name: "Semi-Private Room",           category: "BED_CHARGE", unitPrice: 30000,  nhisPrice: 12000, unit: "per night" },
    { code: "BED-PRIV",   name: "Private Room",                category: "BED_CHARGE", unitPrice: 50000,  unit: "per night" },
    { code: "BED-AMEN",   name: "VIP Amenity Suite",           category: "BED_CHARGE", unitPrice: 120000, unit: "per night" },
    { code: "BED-ICU",    name: "Intensive Care Unit",         category: "BED_CHARGE", unitPrice: 150000, nhisPrice: 60000, unit: "per night" },
    { code: "BED-HDU",    name: "High Dependency Unit",        category: "BED_CHARGE", unitPrice: 90000,  nhisPrice: 40000, unit: "per night" },
    { code: "BED-NICU",   name: "Neonatal Intensive Care",     category: "BED_CHARGE", unitPrice: 100000, nhisPrice: 45000, unit: "per night" },
    { code: "BED-LABOUR", name: "Labour Ward Bed",             category: "BED_CHARGE", unitPrice: 40000,  nhisPrice: 15000, unit: "per night" },

    // Procedures
    { code: "PROC-DRESS", name: "Wound Dressing",              category: "PROCEDURE", unitPrice: 7500,  nhisPrice: 3000 },
    { code: "PROC-SUT",   name: "Suturing",                    category: "PROCEDURE", unitPrice: 15000, nhisPrice: 6000 },
    { code: "PROC-CATH",  name: "Urethral Catheterisation",    category: "PROCEDURE", unitPrice: 12000, nhisPrice: 5000 },
    { code: "PROC-IV",    name: "IV Cannulation",              category: "PROCEDURE", unitPrice: 5000,  nhisPrice: 2000 },
    { code: "PROC-NEB",   name: "Nebulisation",                category: "PROCEDURE", unitPrice: 6000,  nhisPrice: 2500 },
    { code: "PROC-CIRC",  name: "Circumcision",                category: "PROCEDURE", unitPrice: 35000, nhisPrice: 15000 },

    // Surgery
    { code: "SURG-APPEND", name: "Appendectomy",               category: "SURGERY", unitPrice: 450000, nhisPrice: 200000 },
    { code: "SURG-CS",     name: "Caesarean Section",          category: "SURGERY", unitPrice: 600000, nhisPrice: 280000 },
    { code: "SURG-HERNIA", name: "Hernia Repair",              category: "SURGERY", unitPrice: 400000, nhisPrice: 180000 },
    { code: "SURG-MYOM",   name: "Myomectomy",                 category: "SURGERY", unitPrice: 750000, nhisPrice: 350000 },
    { code: "SURG-SVD",    name: "Spontaneous Vaginal Delivery", category: "SURGERY", unitPrice: 180000, nhisPrice: 80000 },

    // Nursing
    { code: "NURS-INJ",    name: "Injection Administration",   category: "NURSING", unitPrice: 3000, nhisPrice: 1000 },
    { code: "NURS-VITALS", name: "Vital Signs Check",          category: "NURSING", unitPrice: 2000, nhisPrice: 800 },
    { code: "NURS-OBS",    name: "Nursing Observation",        category: "NURSING", unitPrice: 8000, nhisPrice: 3000, unit: "per day" },

    // Ambulance
    { code: "AMB-LOCAL",  name: "Ambulance — Within City",     category: "AMBULANCE", unitPrice: 45000 },
    { code: "AMB-INTER",  name: "Ambulance — Intercity",       category: "AMBULANCE", unitPrice: 1200, unit: "per km" },

    // Consumables
    { code: "CONSUM-GLOVE", name: "Examination Gloves",        category: "CONSUMABLE", unitPrice: 500,  unit: "per pair" },
    { code: "CONSUM-SYR",   name: "Syringe & Needle",          category: "CONSUMABLE", unitPrice: 350,  unit: "each" },
    { code: "CONSUM-IVSET", name: "IV Giving Set",             category: "CONSUMABLE", unitPrice: 1500, unit: "each" },
  ];

  const services: Record<string, { id: string }> = {};
  for (const svc of serviceData) {
    const item = await prisma.serviceItem.upsert({
      where: { code_organizationId: { code: svc.code, organizationId: org.id } },
      update: { name: svc.name, unitPrice: svc.unitPrice, nhisPrice: svc.nhisPrice ?? null },
      create: {
        code: svc.code,
        name: svc.name,
        category: svc.category,
        unitPrice: svc.unitPrice,
        nhisPrice: svc.nhisPrice ?? null,
        unit: svc.unit ?? null,
        organizationId: org.id,
      },
    });
    services[svc.code] = item;
  }
  console.log(`   ${serviceData.length} service items in catalogue`);

  // Which consultation fee each department auto-charges on encounter start
  const deptConsultation: Record<string, string> = {
    OPD: "CONS-GEN",
    EMG: "CONS-EMG",
    IPD: "CONS-SPEC",
    LAB: "CONS-GEN",
    RAD: "CONS-GEN",
    PHR: "CONS-GEN",
    SRG: "CONS-SPEC",
    PED: "CONS-SPEC",
  };
  for (const [code, svcCode] of Object.entries(deptConsultation)) {
    await prisma.department.update({
      where: { id: departments[code]!.id },
      data: { consultationServiceItemId: services[svcCode]!.id },
    });
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

  // Beds, by ward class — each linked to its nightly bed-charge service item
  const bedDeptId = departments["IPD"]!.id;
  const wardPlan = [
    { ward: "General Ward",     wardClass: "GENERAL", service: "BED-GEN",    prefix: "GW", count: 12 },
    { ward: "Semi-Private",     wardClass: "SEMI",    service: "BED-SEMI",   prefix: "SP", count: 6 },
    { ward: "Private Rooms",    wardClass: "PRIVATE", service: "BED-PRIV",   prefix: "PR", count: 6 },
    { ward: "Intensive Care",   wardClass: "ICU",     service: "BED-ICU",    prefix: "IC", count: 4 },
    { ward: "Labour Ward",      wardClass: "LABOUR",  service: "BED-LABOUR", prefix: "LW", count: 4 },
  ];

  let bedCount = 0;
  for (const w of wardPlan) {
    for (let i = 1; i <= w.count; i++) {
      const bedNumber = `${w.prefix}${String(i).padStart(2, "0")}`;
      await prisma.bed.upsert({
        where: { bedNumber_departmentId: { bedNumber, departmentId: bedDeptId } },
        update: { wardClass: w.wardClass, serviceItemId: services[w.service]!.id },
        create: {
          bedNumber,
          ward: w.ward,
          wardClass: w.wardClass,
          serviceItemId: services[w.service]!.id,
          departmentId: bedDeptId,
        },
      });
      bedCount++;
    }
  }
  console.log(`   ${bedCount} beds across ${wardPlan.length} ward classes`);

  console.log("✅  Seed complete");
  console.log("   Admin:  admin@hostital.ng  /  admin123456");
  console.log("   Doctor: dr.adeyemi@caresync.ng  /  Doctor@123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
