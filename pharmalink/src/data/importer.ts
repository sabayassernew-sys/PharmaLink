import type { ImportRow } from "../domain/types";
import { validateRow } from "../domain/engine";
const aliases: Record<string, string[]> = {
  name: ["name", "الاسم التجاري", "اسم الدواء"],
  ingredient: ["ingredient", "المادة الفعالة"],
  batch: ["batch", "التشغيلة", "رقم التشغيلة"],
  expiry: ["expiry", "تاريخ الانتهاء", "الصلاحية"],
  unit: ["unit", "الوحدة"],
  quantity: ["quantity", "الكمية"],
  price: ["price", "السعر المرجعي", "السعر"],
  catalogId: ["catalogid", "معرف الصنف"],
  strength: ["strength", "التركيز"],
  dosageForm: ["dosageform", "الشكل الدوائي"],
  cold: ["cold", "مبرد"],
};
function numeric(v: unknown, label: string, row: number) {
  if (
    v === null ||
    v === undefined ||
    typeof v === "boolean" ||
    typeof v === "object" ||
    String(v).trim() === ""
  )
    throw new Error(
      `الصف ${row}: ${label} مطلوب؛ اكتب صفرًا صراحة إذا كان مقصودًا`,
    );
  const n = Number(v);
  if (!Number.isFinite(n))
    throw new Error(`الصف ${row}: ${label} يجب أن يكون رقمًا صالحًا`);
  return n;
}
function date(v: unknown) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "").trim();
}
function csv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quote = !quote;
    } else if (c === "," && !quote) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quote) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quote) throw new Error("علامات اقتباس غير مكتملة في CSV");
  row.push(value);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export async function parseFile(
  file: File,
): Promise<{ rows: ImportRow[]; fingerprint: string }> {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("الحد الأقصى للملف 5 ميجابايت");
  const bytes = await file.arrayBuffer();
  let rows: unknown[][] = [];
  if (/\.csv$/i.test(file.name)) {
    rows = csv(new TextDecoder().decode(bytes).replace(/^\uFEFF/, ""));
  } else if (/\.xlsx$/i.test(file.name)) {
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes);
    const sheet = wb.worksheets[0];
    if (!sheet) throw new Error("المصنف فارغ");
    sheet.eachRow({ includeEmpty: false }, (row) => {
      rows.push(row.values instanceof Array ? row.values.slice(1) : []);
    });
  } else throw new Error("استخدم XLSX أو CSV");
  if (rows.length > 2001) throw new Error("الحد الأقصى 2000 بند في الدفعة");
  if (rows.length < 2) throw new Error("لا توجد بيانات");
  const headers = rows[0].map((x) =>
    String(x ?? "")
      .trim()
      .toLowerCase(),
  );
  const indices = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headers.findIndex((h) => names.includes(h)),
    ]),
  );
  for (const k of ["name", "batch", "expiry", "unit", "quantity", "price"])
    if (indices[k] === -1) throw new Error("عمود مفقود: " + aliases[k][1]);
  const result = rows
    .slice(1)
    .filter((r) =>
      r.some((v) => v !== null && v !== undefined && String(v).trim()),
    )
    .map((r, n) => {
      const get = (key: string) => r[indices[key]];
      const obj: ImportRow = {
        catalogId: String(get("catalogId") ?? "").trim() || undefined,
        strength: String(get("strength") ?? "").trim() || undefined,
        dosageForm: String(get("dosageForm") ?? "").trim() || undefined,
        name: String(get("name") ?? "").trim(),
        ingredient: String(get("ingredient") ?? "").trim(),
        batch: String(get("batch") ?? "").trim(),
        expiry: date(get("expiry")),
        unit: String(get("unit") ?? "").trim(),
        quantity: numeric(get("quantity"), "الكمية", n + 2),
        price: numeric(get("price"), "السعر", n + 2),

        cold: ["true", "1", "نعم"].includes(String(get("cold")).toLowerCase()),
      };
      try {
        validateRow(obj);
      } catch (e) {
        throw new Error(`الصف ${n + 2}: ${(e as Error).message}`);
      }
      return obj;
    });
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return {
    rows: result,
    fingerprint: Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  };
}
