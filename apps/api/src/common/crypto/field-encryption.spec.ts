import {
  FieldEncryptionKeyError,
  decryptValue,
  encryptValue,
  isEncrypted,
  loadKey,
} from "./field-cipher";
import {
  ENCRYPTED_FIELDS,
  EncryptedFieldQueryError,
  assertNotQueriedOnCiphertext,
  decryptResult,
  encryptData,
} from "./encrypted-fields";

const KEY = Buffer.alloc(32, 7);
const HEX = "a".repeat(64);

describe("the cipher", () => {
  it("returns what was put in", () => {
    expect(decryptValue(encryptValue("NIN-12345678901", KEY), KEY)).toBe("NIN-12345678901");
  });

  it("does not leave the plaintext visible in the stored value", () => {
    expect(encryptValue("12 Adeola Odeku Street", KEY)).not.toContain("Adeola");
  });

  it("encrypts the same value differently every time", () => {
    // A fixed IV would make equal values equal ciphertexts, which leaks who
    // shares an address or an insurer without decrypting anything.
    expect(encryptValue("NHIS-42", KEY)).not.toBe(encryptValue("NHIS-42", KEY));
  });

  it("refuses a value that has been altered in the database", () => {
    const stored = encryptValue("Penicillin allergy", KEY);
    const [prefix, version, blob] = stored.split(":");
    const bytes = Buffer.from(blob, "base64");
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = [prefix, version, bytes.toString("base64")].join(":");

    // Returning rubbish into a medical record would be worse than failing.
    expect(() => decryptValue(tampered, KEY)).toThrow();
  });

  it("refuses a value encrypted under a different key", () => {
    expect(() => decryptValue(encryptValue("x", KEY), Buffer.alloc(32, 9))).toThrow();
  });

  it("recognises encrypted values and leaves everything else alone", () => {
    expect(isEncrypted(encryptValue("x", KEY))).toBe(true);
    expect(isEncrypted("12 Adeola Odeku Street")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });
});

describe("the key", () => {
  it("is rejected when absent, so nothing can start up storing plaintext", () => {
    expect(() => loadKey(undefined)).toThrow(FieldEncryptionKeyError);
    expect(() => loadKey("   ")).toThrow(FieldEncryptionKeyError);
  });

  it("is rejected when it is not 32 bytes of hex", () => {
    expect(() => loadKey("tooshort")).toThrow(FieldEncryptionKeyError);
    expect(() => loadKey("z".repeat(64))).toThrow(FieldEncryptionKeyError);
    expect(() => loadKey("CHANGE_ME_32_byte_hex_key_" + "x".repeat(38))).toThrow(
      FieldEncryptionKeyError,
    );
  });

  it("accepts a well-formed one", () => {
    expect(loadKey(HEX)).toHaveLength(32);
  });
});

describe("what is encrypted", () => {
  it("never covers a field the patient search runs on", () => {
    // Encrypting any of these makes the search box return nothing at all,
    // because `contains` and equality both run against ciphertext. If a future
    // change needs one of them protected it needs a blind index, not this.
    for (const searchable of ["firstName", "lastName", "mrn", "phone", "email"]) {
      expect(ENCRYPTED_FIELDS.Patient).not.toContain(searchable);
    }
  });

  it("covers the identifiers and free text that are only ever displayed", () => {
    expect(ENCRYPTED_FIELDS.Patient).toEqual(
      expect.arrayContaining(["ninNumber", "nhisNumber", "address", "allergies"]),
    );
    expect(ENCRYPTED_FIELDS.ClinicalNote).toEqual(
      expect.arrayContaining(["subjective", "objective", "assessment", "plan"]),
    );
  });
});

describe("writing", () => {
  it("encrypts the listed fields and no others", () => {
    const data: any = { firstName: "Ada", ninNumber: "NIN-1", address: "12 Marina" };
    encryptData("Patient", data, KEY);

    expect(data.firstName).toBe("Ada");
    expect(isEncrypted(data.ninNumber)).toBe(true);
    expect(decryptValue(data.address, KEY)).toBe("12 Marina");
  });

  it("encrypts a row created through its parent", () => {
    const data: any = {
      patientId: "pat-1",
      patient: { create: { firstName: "Ada", ninNumber: "NIN-2" } },
    };
    encryptData("ClinicalNote", data, KEY);

    expect(isEncrypted(data.patient.create.ninNumber)).toBe(true);
  });

  it("handles the explicit update form", () => {
    const data: any = { address: { set: "New address" } };
    encryptData("Patient", data, KEY);

    expect(decryptValue(data.address.set, KEY)).toBe("New address");
  });

  it("does not encrypt a value twice", () => {
    const data: any = { ninNumber: "NIN-3" };
    encryptData("Patient", data, KEY);
    const once = data.ninNumber;
    encryptData("Patient", data, KEY);

    expect(data.ninNumber).toBe(once);
    expect(decryptValue(data.ninNumber, KEY)).toBe("NIN-3");
  });

  it("leaves a null alone rather than encrypting the absence of a value", () => {
    const data: any = { ninNumber: null };
    encryptData("Patient", data, KEY);
    expect(data.ninNumber).toBeNull();
  });
});

describe("reading", () => {
  it("decrypts a patient reached through another record", () => {
    // Billing, claims and the queue all read the patient with `include`.
    const invoice: any = {
      id: "inv-1",
      patient: { id: "pat-1", nhisNumber: encryptValue("NHIS-7", KEY) },
    };
    decryptResult("Invoice", invoice, KEY);

    expect(invoice.patient.nhisNumber).toBe("NHIS-7");
  });

  it("decrypts every row of a list", () => {
    const rows: any = [
      { address: encryptValue("A", KEY) },
      { address: encryptValue("B", KEY) },
    ];
    decryptResult("Patient", rows, KEY);

    expect(rows.map((r: any) => r.address)).toEqual(["A", "B"]);
  });

  it("passes through a row written before the backfill ran", () => {
    // Mixed plaintext and ciphertext has to read correctly, or the migration
    // is a flag day with the database offline.
    const row: any = { address: "12 Marina", ninNumber: encryptValue("NIN-9", KEY) };
    decryptResult("Patient", row, KEY);

    expect(row.address).toBe("12 Marina");
    expect(row.ninNumber).toBe("NIN-9");
  });
});

describe("querying on an encrypted column", () => {
  it("refuses an equality match", () => {
    expect(() =>
      assertNotQueriedOnCiphertext("Patient", { where: { nhisNumber: "NHIS-7" } }),
    ).toThrow(EncryptedFieldQueryError);
  });

  it("refuses one buried in an OR", () => {
    expect(() =>
      assertNotQueriedOnCiphertext("Patient", {
        where: { OR: [{ phone: "080" }, { ninNumber: "NIN-1" }] },
      }),
    ).toThrow(EncryptedFieldQueryError);
  });

  it("refuses one reached through a relation", () => {
    expect(() =>
      assertNotQueriedOnCiphertext("Invoice", { where: { patient: { is: { address: "x" } } } }),
    ).toThrow(EncryptedFieldQueryError);
  });

  it("refuses sorting by one", () => {
    expect(() =>
      assertNotQueriedOnCiphertext("Patient", { orderBy: { address: "asc" } }),
    ).toThrow(EncryptedFieldQueryError);
  });

  it("allows the columns search actually uses", () => {
    expect(() =>
      assertNotQueriedOnCiphertext("Patient", {
        where: {
          deletedAt: null,
          OR: [
            { firstName: { contains: "ada", mode: "insensitive" } },
            { phone: { contains: "080" } },
          ],
        },
        orderBy: { lastName: "asc" },
      }),
    ).not.toThrow();
  });

  it("names the field and the clause, so the mistake is obvious", () => {
    expect(() =>
      assertNotQueriedOnCiphertext("Patient", { where: { ninNumber: "x" } }),
    ).toThrow(/Patient\.ninNumber/);
  });
});
