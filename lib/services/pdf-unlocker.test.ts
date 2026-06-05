import { describe, expect, it, beforeAll } from "vitest";
import * as mupdf from "mupdf";
import { PDFDocument } from "pdf-lib";
import { unlockPdf, UnlockError } from "./pdf-unlocker";

const MARKER = "UNIQUE_MARKER_12345";

async function makePlainPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 200]);
  page.drawText(MARKER, { x: 30, y: 100, size: 18 });
  return doc.save();
}

/** Re-encrypt a plain PDF with MuPDF so we can test decrypting it back. */
function encrypt(plain: Uint8Array, options: string): Buffer {
  const doc = mupdf.Document.openDocument(plain, "application/pdf");
  try {
    const pdf = doc.asPDF();
    if (!pdf) throw new Error("test fixture is not a PDF");
    return Buffer.from(pdf.saveToBuffer(options).asUint8Array());
  } finally {
    doc.destroy();
  }
}

function opensWithoutPassword(bytes: Uint8Array): boolean {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  try {
    return !doc.needsPassword();
  } finally {
    doc.destroy();
  }
}

function hasMarkerText(bytes: Uint8Array): boolean {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  try {
    const json = doc.loadPage(0).toStructuredText().asJSON();
    return JSON.stringify(JSON.parse(json)).includes(MARKER);
  } finally {
    doc.destroy();
  }
}

describe("unlockPdf", () => {
  let plain: Uint8Array;

  beforeAll(async () => {
    delete process.env.UNLOCK_SERVICE_URL;
    plain = await makePlainPdf();
  });

  for (const enc of ["rc4-128", "aes-128", "aes-256"]) {
    it(`decrypts a ${enc} user-password PDF with the correct password`, async () => {
      const encrypted = encrypt(
        plain,
        `encrypt=${enc},user-password=open123,owner-password=owner999`
      );

      const out = await unlockPdf(encrypted, "open123");

      expect(out.byteLength).toBeGreaterThan(0);
      expect(opensWithoutPassword(out)).toBe(true);
      expect(hasMarkerText(out)).toBe(true);
      // The unlocked file must load in pdf-lib with no ignoreEncryption flag.
      const reloaded = await PDFDocument.load(Buffer.from(out));
      expect(reloaded.getPageCount()).toBe(1);
    });
  }

  it("accepts the owner password to unlock a user-encrypted PDF", async () => {
    const encrypted = encrypt(
      plain,
      "encrypt=aes-256,user-password=open123,owner-password=owner999"
    );
    const out = await unlockPdf(encrypted, "owner999");
    expect(opensWithoutPassword(out)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const encrypted = encrypt(
      plain,
      "encrypt=aes-256,user-password=open123,owner-password=owner999"
    );
    await expect(unlockPdf(encrypted, "wrong")).rejects.toMatchObject({
      code: "INCORRECT_PASSWORD",
    });
  });

  it("reports when a password is required but none is given", async () => {
    const encrypted = encrypt(
      plain,
      "encrypt=aes-256,user-password=open123,owner-password=owner999"
    );
    await expect(unlockPdf(encrypted, "")).rejects.toMatchObject({
      code: "PASSWORD_REQUIRED",
    });
  });

  it("removes owner-only restrictions (no open password)", async () => {
    const restricted = encrypt(
      plain,
      "encrypt=aes-256,owner-password=owner999,permissions=-3900"
    );
    // Opens without a password but copy is disallowed.
    const probe = mupdf.Document.openDocument(restricted, "application/pdf");
    expect(probe.needsPassword()).toBe(false);
    expect(probe.hasPermission("copy")).toBe(false);
    probe.destroy();

    const out = await unlockPdf(restricted, "");
    expect(opensWithoutPassword(out)).toBe(true);
    expect(hasMarkerText(out)).toBe(true);
  });

  it("passes through an unencrypted PDF", async () => {
    const out = await unlockPdf(Buffer.from(plain), "");
    expect(opensWithoutPassword(out)).toBe(true);
    expect(hasMarkerText(out)).toBe(true);
  });

  it("rejects a non-PDF input as INVALID_PDF", async () => {
    const garbage = Buffer.from("this is definitely not a pdf");
    await expect(unlockPdf(garbage, "")).rejects.toBeInstanceOf(UnlockError);
    await expect(unlockPdf(garbage, "")).rejects.toMatchObject({
      code: "INVALID_PDF",
    });
  });
});
