import { useState } from "react";
import {
  ArrowRightLeft,
  Printer,
  Eye,
  Check,
  Send,
  PackageCheck,
} from "lucide-react";
import { useApp } from "../context";
import { visibleTransfers, available, eligible } from "../domain/access";
import type { Transfer, Receipt } from "../domain/types";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Form,
  Modal,
  PageTitle,
  Status,
} from "../components/UI";
export function Transfers() {
  const { state, actor, run, busy } = useApp();
  const [tab, setTab] = useState("all");
  const [create, setCreate] = useState(false);
  const [source, setSource] = useState(
    state.branches.find((b) => b.chainId === actor.chainId)?.id || "",
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt[] | null>(null);
  const [resolution, setResolution] = useState<{
    id: string;
    itemId: string;
  } | null>(null);
  const transfers = visibleTransfers(state, actor);
  const branch = (id: string) =>
    state.branches.find((b) => b.id === id)?.name || id;
  const visible = transfers.filter((t) =>
    tab === "all" || tab === "incoming"
      ? tab === "all" || t.to === actor.branchId
      : tab === "outgoing"
        ? t.from === actor.branchId
        : tab === "closed"
          ? ["completed", "cancelled", "rejected"].includes(t.status)
          : t.status === tab,
  );
  const current = transfers.find((t) => t.id === selected);
  const approve = (t: Transfer) => {
    if (
      [
        "cancelled",
        "rejected",
        "completed",
        "sent",
        "discrepancy",
        "ready",
      ].includes(t.status)
    )
      return false;
    if (actor.role === "agency_master") return !t.managementApproved;
    return actor.branchId === t.from
      ? !t.senderApproved
      : actor.branchId === t.to && !t.receiverApproved;
  };
  return (
    <>
      <PageTitle
        eyebrow="حركة مخزون موثقة"
        title="المناقلات الداخلية"
        description="تابع الطلب من الموافقة إلى الاستلام، دون إدارة توصيل أو سائقين."
        actions={
          actor.role === "agency_master" ? (
            <Button onClick={() => setCreate(true)}>إنشاء أمر مناقلة</Button>
          ) : undefined
        }
      />
      <div className="tabs mb-5">
        {[
          ["all", "جميع المناقلات"],
          ["incoming", "واردة"],
          ["outgoing", "صادرة"],
          ["sent", "بانتظار الاستلام"],
          ["discrepancy", "الاختلافات"],
          ["closed", "المغلقة"],
        ]
          .filter(
            ([k]) =>
              actor.role !== "agency_master" ||
              !["incoming", "outgoing"].includes(k),
          )
          .map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={key === tab ? "active" : ""}
            >
              {label}
            </button>
          ))}
      </div>
      <Card>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم المناقلة</th>
                <th>من / إلى</th>
                <th>الأصناف</th>
                <th>تاريخ الطلب</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td>
                    <code>{t.code}</code>
                  </td>
                  <td>
                    <strong>{branch(t.from)}</strong>
                    <small>إلى {branch(t.to)}</small>
                  </td>
                  <td>
                    {t.lines.map((l) => l.name).join("، ")}
                    <small>
                      {t.lines.reduce((n, l) => n + l.quantity, 0)} وحدة •{" "}
                      {t.lines.length} بند
                    </small>
                  </td>
                  <td>{new Date(t.created).toLocaleDateString("ar-YE")}</td>
                  <td>
                    <Status value={t.status} />
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setSelected(t.id)}>
                      <Eye size={16} /> التفاصيل
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <Empty
            title="لا توجد مناقلات في هذا القسم"
            description="ابدأ طلبًا من المخزون أو من ساحة الفائض والاحتياج."
          />
        )}
      </Card>
      {current && (
        <Modal
          title={`مناقلة ${current.code}`}
          wide
          onClose={() => {
            setSelected(null);
            setReceipt(null);
          }}
        >
          <div className="print-voucher">
            <div className="voucher-title">
              <img src="./brand/icon.svg" width="38" />
              <div>
                <h3>سند مناقلة داخلية — PharmaLink</h3>
                <p>{current.code} · عمولة المنصة: صفر</p>
              </div>
              <Status value={current.status} />
            </div>
            <div className="transfer-route">
              <div>
                <small>الفرع المرسل</small>
                <h3>{branch(current.from)}</h3>
              </div>
              <ArrowRightLeft size={25} />
              <div>
                <small>الفرع المستلم</small>
                <h3>{branch(current.to)}</h3>
              </div>
            </div>
            <div className="approval-strip">
              <Badge tone={current.senderApproved ? "success" : "neutral"}>
                موافقة المرسل {current.senderApproved ? "✓" : "—"}
              </Badge>
              <Badge tone={current.receiverApproved ? "success" : "neutral"}>
                موافقة المستلم {current.receiverApproved ? "✓" : "—"}
              </Badge>
              <Badge tone={current.managementApproved ? "success" : "neutral"}>
                {current.policy === "centralized"
                  ? "اعتماد الإدارة"
                  : "تفويض الفروع"}{" "}
                {current.managementApproved ? "✓" : ""}
              </Badge>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>التشغيلة / الصلاحية</th>
                    <th>المطلوب</th>
                    <th>المقبول</th>
                    <th>المرفوض</th>
                    <th>الناقص</th>
                  </tr>
                </thead>
                <tbody>
                  {current.lines.map((l) => (
                    <tr key={l.itemId}>
                      <td>
                        {l.name}
                        <small>{l.unit}</small>
                      </td>
                      <td>
                        <code>{l.batch}</code>
                        <small>{l.expiry}</small>
                      </td>
                      <td>{l.quantity}</td>
                      <td>{l.accepted ?? "—"}</td>
                      <td>{l.rejected ?? "—"}</td>
                      <td>{l.missing ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="my-3">{current.note || "دون ملاحظات"}</p>
            <div className="timeline">
              {state.events
                .filter((e) => e.reference === current.id)
                .map((e) => (
                  <div className="timeline-row" key={e.id}>
                    <strong>{e.action}</strong>
                    <p>{e.detail}</p>
                    <small>
                      {e.actor} • {new Date(e.at).toLocaleString("ar-YE")}
                    </small>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5 no-print">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} /> طباعة السند
            </Button>
            {approve(current) && (
              <Button
                disabled={busy}
                onClick={() => run({ type: "approveTransfer", id: current.id })}
              >
                <Check size={17} />{" "}
                {actor.role === "agency_master"
                  ? "اعتماد الإدارة"
                  : actor.branchId === current.from
                    ? "الموافقة وحجز الكمية"
                    : "الموافقة على الاستقبال"}
              </Button>
            )}
            {actor.branchId === current.from && current.status === "ready" && (
              <Button
                disabled={busy}
                onClick={() => run({ type: "sendTransfer", id: current.id })}
              >
                <Send size={16} /> تأكيد الإرسال الفعلي
              </Button>
            )}
            {actor.branchId === current.to && current.status === "sent" && (
              <Button
                onClick={() =>
                  setReceipt(
                    current.lines.map((l) => ({
                      itemId: l.itemId,
                      accepted: l.quantity,
                      rejected: 0,
                      missing: 0,
                    })),
                  )
                }
              >
                <PackageCheck size={17} /> فحص وتأكيد الاستلام
              </Button>
            )}
            {["pending", "management", "ready"].includes(current.status) && (
              <Button
                disabled={busy}
                variant="danger"
                onClick={() => {
                  if (confirm("إلغاء الطلب وفك أي حجز؟"))
                    run({ type: "cancelTransfer", id: current.id });
                }}
              >
                إلغاء الطلب
              </Button>
            )}
          </div>
          {receipt && (
            <Form
              onSubmit={async () => {
                if (
                  await run({
                    type: "receiveTransfer",
                    id: current.id,
                    lines: receipt,
                  })
                )
                  setReceipt(null);
              }}
            >
              <h3 className="mt-5">فحص الكميات المستلمة</h3>
              {receipt.map((r, n) => (
                <fieldset className="receipt-line" key={r.itemId}>
                  <legend>
                    {current.lines[n].name} • المرسل {current.lines[n].quantity}
                  </legend>
                  <div className="grid grid-cols-3 gap-3">
                    {(["accepted", "rejected", "missing"] as const).map(
                      (k, j) => (
                        <label key={k} className="field">
                          <span>{["مقبول", "مرفوض / معزول", "ناقص"][j]}</span>
                          <input
                            aria-label={k + "-" + n}
                            type="number"
                            min={0}
                            required
                            value={r[k]}
                            onChange={(e) =>
                              setReceipt(
                                receipt.map((l, m) =>
                                  m === n
                                    ? { ...l, [k]: Number(e.target.value) }
                                    : l,
                                ),
                              )
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
              ))}
              <Button type="submit" disabled={busy}>
                حفظ الاستلام الفعلي
              </Button>
            </Form>
          )}
          {current.status === "discrepancy" &&
            current.lines
              .filter((l) => l.rejected || l.missing)
              .map((l) => (
                <div className="notice mt-4" key={l.itemId}>
                  <strong>{l.name}</strong>
                  <p>
                    مرفوض {l.rejected || 0} · ناقص {l.missing || 0}{" "}
                    {l.returnStatus && `· المرتجع: ${l.returnStatus}`}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setResolution({ id: current.id, itemId: l.itemId })
                    }
                  >
                    معالجة الاختلاف / المرتجع
                  </Button>
                </div>
              ))}
        </Modal>
      )}
      {create && (
        <Modal title="أمر مناقلة مركزي" onClose={() => setCreate(false)}>
          <Form
            onSubmit={async (f) => {
              if (
                await run({
                  type: "transfer",
                  from: source,
                  to: String(f.get("to")),
                  items: [
                    {
                      itemId: String(f.get("item")),
                      quantity: Number(f.get("qty")),
                    },
                  ],
                  note: String(f.get("note") || ""),
                })
              )
                setCreate(false);
            }}
          >
            <label className="field">
              <span>الفرع المرسل</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {state.branches
                  .filter((b) => b.chainId === actor.chainId)
                  .map((b) => (
                    <option value={b.id} key={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>الفرع المستلم</span>
              <select name="to">
                {state.branches
                  .filter((b) => b.chainId === actor.chainId && b.id !== source)
                  .map((b) => (
                    <option value={b.id} key={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>بند المخزون</span>
              <select name="item" required>
                {state.items
                  .filter(
                    (i) =>
                      i.branchId === source &&
                      eligible(i) &&
                      available(state, i.id) > 0,
                  )
                  .map((i) => (
                    <option value={i.id} key={i.id}>
                      {i.name} · {i.batch} · متاح {available(state, i.id)}
                    </option>
                  ))}
              </select>
            </label>
            <Field
              label="الكمية"
              name="qty"
              type="number"
              min={1}
              defaultValue={1}
            />
            <Field label="سبب المناقلة" name="note" required={false} />
            <p>
              الأمر معتمد إداريًا؛ تبقى موافقة الفرعين وتأكيد التنفيذ الفعلي.
            </p>
            <Button type="submit" disabled={busy}>
              إنشاء الأمر
            </Button>
          </Form>
        </Modal>
      )}
      {resolution && (
        <Modal title="معالجة اختلاف موثقة" onClose={() => setResolution(null)}>
          <Form
            onSubmit={async (f) => {
              if (
                await run({
                  type: "resolve",
                  id: resolution.id,
                  itemId: resolution.itemId,
                  method: String(f.get("method")) as "accept",
                  reason: String(f.get("reason")),
                })
              )
                setResolution(null);
            }}
          >
            <p>
              الإدارة تعتمد المعالجة؛ الفرع يؤكد إرسال المرتجع واستلامه. المرتجع
              يُستلم في عهدة معزولة لدى الفرع الأصلي.
            </p>
            <label className="field">
              <span>نوع المعالجة</span>
              <select name="method">
                {actor.role === "agency_master" ? (
                  <>
                    <option value="accept">قبول المرفوض بعد التحقق</option>
                    <option value="writeoff">تسوية تلف موثقة</option>
                    <option value="return">اعتماد إرجاع المرفوض</option>
                    <option value="found">
                      تأكيد العثور على الناقص واستلامه
                    </option>
                    <option value="lost">تسوية فقد الناقص</option>
                  </>
                ) : (
                  <>
                    <option value="returnSend">
                      تأكيد إرسال المرتجع من المستلم
                    </option>
                    <option value="returnReceive">
                      تأكيد استلام المرتجع بالفرع الأصلي
                    </option>
                  </>
                )}
              </select>
            </label>
            <Field label="سبب المعالجة والأدلة المرجعية" name="reason" />
            <Button type="submit" disabled={busy}>
              تأكيد الإجراء
            </Button>
          </Form>
        </Modal>
      )}
    </>
  );
}
