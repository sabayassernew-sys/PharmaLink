import { useState } from "react";
import {
  Plus,
  Search,
  ArrowUpLeft,
  Clock,
  Package,
  ArrowDownToLine,
} from "lucide-react";
import { useApp } from "../context";
import { available, eligible, visibleItems } from "../domain/access";
import type { Post } from "../domain/types";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Form,
  Modal,
  PageTitle,
} from "../components/UI";
export function Board() {
  const { state, actor, run, busy } = useApp();
  const [tab, setTab] = useState("surplus");
  const [query, setQuery] = useState("");
  const [need, setNeed] = useState(false);
  const [respond, setRespond] = useState<Post | null>(null);
  const [itemId, setItem] = useState("");
  const inChain = (id: string) =>
    state.branches.find((b) => b.id === id)?.chainId === actor.chainId;
  const posts = state.posts.filter(
    (p) =>
      inChain(p.branchId) &&
      (tab === "mine" ? p.branchId === actor.branchId : p.kind === tab) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const candidates = visibleItems(state, actor).filter(
    (i) =>
      eligible(i) &&
      available(state, i.id) > 0 &&
      i.branchId !== respond?.branchId,
  );
  return (
    <>
      <PageTitle
        eyebrow="داخل السلسلة فقط"
        title="الفائض والاحتياج"
        description="اربط فائض فرعك باحتياج الفروع الشقيقة، ثم تابع طلب المناقلة."
        actions={
          actor.role === "agency_branch" ? (
            <Button onClick={() => setNeed(true)}>
              <Plus size={17} /> نشر احتياج
            </Button>
          ) : undefined
        }
      />
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div className="tabs">
          {[
            ["surplus", "فائض الفروع"],
            ["need", "احتياجات الفروع"],
            ["mine", "إعلانات فرعي"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input
            placeholder="ابحث عن دواء..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 md:grid-cols-2 gap-5">
        {posts.map((p) => {
          const expired = new Date(p.expires) < new Date(),
            own = p.branchId === actor.branchId;
          const left = Math.max(
            0,
            Math.min(
              p.quantity - p.allocated,
              p.itemId ? available(state, p.itemId) : p.quantity,
            ),
          );
          return (
            <Card key={p.id} className="exchange-card">
              <div className="flex justify-between">
                <Badge tone={p.kind === "surplus" ? "success" : "blue"}>
                  {p.kind === "surplus" ? "فائض داخلي" : "طلب احتياج"}
                </Badge>
                <Badge
                  tone={
                    p.status === "closed" || expired ? "neutral" : "warning"
                  }
                >
                  {p.status === "closed" ? "مغلق" : expired ? "منتهي" : "نشط"}
                </Badge>
              </div>
              <div className="exchange-icon">
                {p.kind === "surplus" ? <Package /> : <ArrowDownToLine />}
              </div>
              <h3>{p.name}</h3>
              <p>{state.branches.find((b) => b.id === p.branchId)?.name}</p>
              <div className="exchange-quantity">
                <strong>{left}</strong>
                <span>{p.unit} متاحة للطلب</span>
              </div>
              <p>{p.notes || "بدون ملاحظات إضافية"}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <Clock size={14} />
                {new Date(p.expires).toLocaleString("ar-YE")}
              </div>
              {own || actor.role === "agency_master" ? (
                <Button
                  variant="secondary"
                  disabled={busy || p.status === "closed"}
                  onClick={() => run({ type: "closePost", id: p.id })}
                >
                  إغلاق الإعلان
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={expired || p.status !== "open" || left === 0}
                  onClick={() => {
                    setRespond(p);
                    setItem(candidates[0]?.id || "");
                  }}
                >
                  طلب مناقلة <ArrowUpLeft size={16} />
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      {!posts.length && (
        <Card>
          <Empty
            title="لا توجد إعلانات مطابقة"
            description="انشر فائضًا من إجراءات الصنف أو أنشئ طلب احتياج."
          />
        </Card>
      )}
      {need && (
        <Modal title="طلب احتياج للفروع الشقيقة" onClose={() => setNeed(false)}>
          <Form
            onSubmit={async (f) => {
              if (
                await run({
                  type: "post",
                  kind: "need",
                  branchId: actor.branchId!,
                  name: String(f.get("name")),
                  quantity: Number(f.get("quantity")),
                  unit: String(f.get("unit")),
                  notes: String(f.get("notes") || ""),
                })
              )
                setNeed(false);
            }}
          >
            <p>
              يمكن طلب دواء غير موجود في مخزون فرعك. لا يضيف هذا الطلب رصيدًا.
            </p>
            <Field label="اسم الدواء والتركيز" name="name" />
            <Field
              label="الكمية المطلوبة"
              name="quantity"
              type="number"
              min={1}
              defaultValue={10}
            />
            <Field label="الوحدة وحجم العبوة" name="unit" defaultValue="باكت" />
            <Field label="ملاحظات" name="notes" required={false} />
            <Button type="submit" disabled={busy}>
              نشر الاحتياج • 48 ساعة
            </Button>
          </Form>
        </Modal>
      )}
      {respond && (
        <Modal title="طلب مناقلة من إعلان" onClose={() => setRespond(null)}>
          <Form
            onSubmit={async (f) => {
              const source =
                respond.kind === "surplus"
                  ? state.items.find((i) => i.id === respond.itemId)
                  : state.items.find((i) => i.id === itemId);
              if (!source) return;
              const to =
                respond.kind === "surplus" ? actor.branchId! : respond.branchId;
              if (
                await run({
                  type: "transfer",
                  from: source.branchId,
                  to,
                  items: [
                    { itemId: source.id, quantity: Number(f.get("quantity")) },
                  ],
                  postId: respond.id,
                  note: String(f.get("note") || ""),
                })
              )
                setRespond(null);
            }}
          >
            <h3>{respond.name}</h3>
            {respond.kind === "need" && (
              <label className="field">
                <span>
                  التشغيلة التي توفر الاحتياج (تحقق من تطابق الدواء والوحدة)
                </span>
                <select
                  required
                  value={itemId}
                  onChange={(e) => setItem(e.target.value)}
                >
                  <option value="">اختر بندًا</option>
                  {candidates.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} • {i.batch} • {i.unit}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Field
              label="الكمية"
              name="quantity"
              type="number"
              min={1}
              max={respond.quantity - respond.allocated}
              defaultValue={1}
            />
            <Field label="ملاحظة" name="note" required={false} />
            <p>يُنشأ طلب فقط؛ الحجز عند موافقة الفرع المرسل.</p>
            <Button type="submit" disabled={busy}>
              إرسال الطلب
            </Button>
          </Form>
        </Modal>
      )}
    </>
  );
}
