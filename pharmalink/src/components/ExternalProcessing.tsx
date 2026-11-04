import { useApp } from "../context";
import { Button, Field, Form } from "./UI";
export function ExternalProcessing({ id }: { id: string }) {
  const { state, actor, run, busy } = useApp();
  const o = state.orders.find((o) => o.id === id)!;
  if (!o.rejected && !o.missing) return null;
  return (
    <div className="notice mt-4">
      <h3>عهدة الطلب {id.slice(-8)}</h3>
      <p>
        مقبول {o.accepted || 0} · معزول {o.rejected || 0} · ناقص قيد التحقيق{" "}
        {o.missing || 0} {state.items.find((i) => i.id === o.itemId)?.unit}.{" "}
        {o.returnStatus &&
          "حالة المرتجع: " +
            { approved: "معتمد", sent: "مرسل", received: "مستلم" }[
              o.returnStatus
            ]}
      </p>
      <Form
        onSubmit={(f) =>
          run({
            type: "externalResolve",
            id,
            method: String(f.get("method")) as "return",
            reason: String(f.get("reason")),
          })
        }
      >
        <label className="field">
          <span>الإجراء المتاح حسب الحساب</span>
          <select name="method" required>
            <option value="">اختر إجراء</option>
            {actor.role === "admin" ? (
              <>
                {!!o.rejected && !o.returnStatus && (
                  <>
                    <option value="return">اعتماد إرجاع المعزول</option>
                    <option value="accept">قبول المعزول بعد التحقق</option>
                    <option value="writeoff">تسوية تلف المعزول</option>
                  </>
                )}
                {!!o.missing && (
                  <>
                    <option value="found">
                      توثيق العثور على الناقص واستلامه
                    </option>
                    <option value="lost">تسوية فقد الناقص</option>
                  </>
                )}
              </>
            ) : (
              <>
                {actor.branchId === o.buyer &&
                  o.returnStatus === "approved" && (
                    <option value="returnSend">تأكيد إرسال المرتجع</option>
                  )}
                {actor.branchId === o.seller && o.returnStatus === "sent" && (
                  <option value="returnReceive">
                    تأكيد استلام المرتجع في عهدة معزولة
                  </option>
                )}
              </>
            )}
          </select>
        </label>
        <Field name="reason" label="سبب الإجراء ومرجع التحقق" />
        <Button type="submit" disabled={busy}>
          تأكيد معالجة العهدة
        </Button>
      </Form>
    </div>
  );
}
