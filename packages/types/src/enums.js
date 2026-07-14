"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Department = exports.UserStatus = exports.StaffRole = exports.AppointmentType = exports.AppointmentStatus = exports.BloodGroup = exports.Gender = void 0;
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
})(Gender || (exports.Gender = Gender = {}));
var BloodGroup;
(function (BloodGroup) {
    BloodGroup["A_POS"] = "A_POS";
    BloodGroup["A_NEG"] = "A_NEG";
    BloodGroup["B_POS"] = "B_POS";
    BloodGroup["B_NEG"] = "B_NEG";
    BloodGroup["AB_POS"] = "AB_POS";
    BloodGroup["AB_NEG"] = "AB_NEG";
    BloodGroup["O_POS"] = "O_POS";
    BloodGroup["O_NEG"] = "O_NEG";
})(BloodGroup || (exports.BloodGroup = BloodGroup = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
var AppointmentType;
(function (AppointmentType) {
    AppointmentType["CONSULTATION"] = "CONSULTATION";
    AppointmentType["FOLLOW_UP"] = "FOLLOW_UP";
    AppointmentType["PROCEDURE"] = "PROCEDURE";
    AppointmentType["LAB_TEST"] = "LAB_TEST";
    AppointmentType["IMAGING"] = "IMAGING";
    AppointmentType["TELEMEDICINE"] = "TELEMEDICINE";
    AppointmentType["EMERGENCY"] = "EMERGENCY";
})(AppointmentType || (exports.AppointmentType = AppointmentType = {}));
var StaffRole;
(function (StaffRole) {
    StaffRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    StaffRole["HOSPITAL_ADMIN"] = "HOSPITAL_ADMIN";
    StaffRole["DEPARTMENT_HEAD"] = "DEPARTMENT_HEAD";
    StaffRole["DOCTOR"] = "DOCTOR";
    StaffRole["NURSE"] = "NURSE";
    StaffRole["LAB_TECHNOLOGIST"] = "LAB_TECHNOLOGIST";
    StaffRole["RADIOLOGIST"] = "RADIOLOGIST";
    StaffRole["PHARMACIST"] = "PHARMACIST";
    StaffRole["CASHIER"] = "CASHIER";
    StaffRole["RECEPTIONIST"] = "RECEPTIONIST";
    StaffRole["HR_OFFICER"] = "HR_OFFICER";
    StaffRole["AUDITOR"] = "AUDITOR";
})(StaffRole || (exports.StaffRole = StaffRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["PENDING_VERIFICATION"] = "PENDING_VERIFICATION";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var Department;
(function (Department) {
    Department["OUTPATIENT"] = "OUTPATIENT";
    Department["INPATIENT"] = "INPATIENT";
    Department["EMERGENCY"] = "EMERGENCY";
    Department["SURGERY"] = "SURGERY";
    Department["PEDIATRICS"] = "PEDIATRICS";
    Department["OBSTETRICS"] = "OBSTETRICS";
    Department["CARDIOLOGY"] = "CARDIOLOGY";
    Department["NEUROLOGY"] = "NEUROLOGY";
    Department["ONCOLOGY"] = "ONCOLOGY";
    Department["RADIOLOGY"] = "RADIOLOGY";
    Department["LABORATORY"] = "LABORATORY";
    Department["PHARMACY"] = "PHARMACY";
    Department["ICU"] = "ICU";
    Department["PHYSIOTHERAPY"] = "PHYSIOTHERAPY";
})(Department || (exports.Department = Department = {}));
//# sourceMappingURL=enums.js.map