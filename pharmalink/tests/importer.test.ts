import { it, expect } from "vitest";
import { parseFile } from "../src/data/importer";
it("يقرأ CSV عربيًا فعليًا مع بيانات هوية اختيارية", async () => {
  const file = new File(
    [
      "\uFEFFالاسم التجاري,المادة الفعالة,التشغيلة,تاريخ الانتهاء,الوحدة,الكمية,السعر المرجعي,معرف الصنف,التركيز,الشكل الدوائي\nدواء تجريبي,مادة,B01,2030-12-31,علبة,5,100,CAT-01,10mg,قرص\n",
    ],
    "test.csv",
  );
  const result = await parseFile(file);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].catalogId).toBe("CAT-01");
  expect(result.rows[0].quantity).toBe(5);
  expect(result.fingerprint).toHaveLength(64);
});
it("يرفض استيراد تاريخ غير صالح من ملف حقيقي", async () => {
  const file = new File(
    ["name,batch,expiry,unit,quantity,price\nTest,B1,2030-02-30,box,5,100"],
    "bad.csv",
  );
  await expect(parseFile(file)).rejects.toThrow("تاريخ غير صالح");
});
