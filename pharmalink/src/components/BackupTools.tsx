import { useState } from "react";
import { useApp } from "../context";
import { parseBackup } from "../domain/backups";
import { saveBlob, STORAGE_KEY, repository } from "../data/repository";
import { createSeed } from "../data/seed";
import { Card, Button } from "./UI";

export function BackupTools() {
  const { state, actor, reload, notify } = useApp();
  if (actor.role !== "admin") return null;

  const [error, setError] = useState("");
  const [expectedRaw, setExpectedRaw] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [restore, setRestore] = useState<ReturnType<typeof parseBackup> | null>(
    null,
  );
  const download = (data: unknown, name: string) =>
    saveBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      name,
    );
  const snapshot = (raw: string | null) => {
    try {
      return {
        kind: "pharmalink-full-backup",
        state: raw ? JSON.parse(raw) : state,
      };
    } catch {
      return {
        kind: "pharmalink-raw-recovery",
        raw,
        note: "بيانات أصلية تعذر تفسيرها؛ للمراجعة، وليست نسخة استعادة معتمدة",
      };
    }
  };
  const assertAdmin = () => {
    let live = state;
    try {
      live = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || JSON.stringify(state),
      );
    } catch {
      if (actor.role !== "admin")
        throw new Error("الاستعادة لمدير المنصة المحلي فقط");
    }
    if (
      !live.accounts.some(
        (a: { id: string; role: string }) =>
          a.id === actor.id && a.role === "admin",
      )
    )
      throw new Error("أدوات التطوير لمدير المنصة فقط");
  };

  return (
    <Card>
      <div className="form-grid">
        <h3 className="m-0 text-base font-bold text-slate-800">
          أدوات النسخ الاحتياطي والاستعادة — مدير المنصة
        </h3>
        <Button
          onClick={() =>
            download(
              snapshot(localStorage.getItem(STORAGE_KEY)),
              "pharmalink-full-backup.json",
            )
          }
        >
          تنزيل نسخة احتياطية كاملة
        </Button>
          <label className="field">
            <span>معاينة نسخة كاملة للاستعادة (ستستبدل بيانات التجربة)</span>
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                setRestore(null);
                setError("");
                try {
                  assertAdmin();
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 10 * 1024 * 1024)
                    throw new Error("الحد 10 ميجابايت");
                  const raw = localStorage.getItem(STORAGE_KEY);
                  const parsed = parseBackup(await f.text());
                  setExpectedRaw(raw);
                  setRestore(parsed);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </label>
          {restore && (
            <>
              <p>
                تحتوي {restore.items.length} بندًا و{restore.orders.length}{" "}
                طلبًا. سيبدأ تنزيل نسخة من البيانات الحالية قبل الاستبدال؛ تحققي
                من اكتمال التنزيل في متصفحك.
              </p>
              <Button
                variant="danger"
                onClick={async () => {
                  setReplacing(true);
                  try {
                    assertAdmin();
                    if (!confirm("تأكيد استبدال بيانات التجربة بالكامل؟"))
                      return;
                    await repository.replace(
                      actor.id,
                      restore,
                      expectedRaw,
                      (raw) => download(snapshot(raw), "before-restore.json"),
                    );
                    setRestore(null);
                    reload();
                    notify("تمت استعادة النسخة المحلية");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setReplacing(false);
                  }
                }}
                disabled={replacing}
              >
                تأكيد استعادة النسخة
              </Button>
            </>
          )}
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
          <Button
            variant="danger"
            disabled={replacing}
            onClick={async () => {
              setReplacing(true);
              try {
                assertAdmin();
                if (
                  prompt("لتأكيد إعادة التجربة اكتب: إعادة ضبط") !== "إعادة ضبط"
                )
                  return;
                const raw = localStorage.getItem(STORAGE_KEY);
                await repository.replace(actor.id, createSeed(), raw, (raw) =>
                  download(snapshot(raw), "before-reset.json"),
                );
                reload();
                notify(
                  "أعيد ضبط التجربة وبدأ تنزيل النسخة السابقة؛ تحققي من التنزيل",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setReplacing(false);
              }
            }}
          >
            نسخ البيانات ثم إعادة ضبط التجربة
          </Button>
        </div>
      </Card>
  );
}
