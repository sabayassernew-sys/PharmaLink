import { useState } from "react";
import {
  ArrowLeft,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../context";
import { Button, Modal } from "./UI";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: string) => void;
  onOpenRegister: () => void;
}

export function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenRegister,
}: LoginModalProps) {
  const { state, setActor, notify } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const normalizedEmail = email.trim().toLowerCase();
    const foundAccount = state.accounts.find(
      (a) => a.email && a.email.trim().toLowerCase() === normalizedEmail,
    );

    if (!foundAccount) {
      setErrorMsg("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      return;
    }

    const expectedPassword = foundAccount.password || "123456";
    if (password !== expectedPassword) {
      setErrorMsg("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      return;
    }

    // Pending account
    if (foundAccount.role === "pending") {
      setActor(foundAccount.id);
      notify("تم تسجيل الدخول: حساب المنشأة بانتظار مراجعة واعتماد التراخيص.");
      onSuccess(foundAccount.role);
      onClose();
      return;
    }

    // Suspended account
    if (foundAccount.suspended) {
      setErrorMsg(`الحساب موقوف: ${foundAccount.suspensionReason || "يرجى مراجعة إدارة المنصة"}`);
      return;
    }

    // Success
    setActor(foundAccount.id);
    notify(
      `مرحباً بك ${
        foundAccount.pharmacistName ? `د. ${foundAccount.pharmacistName}` : foundAccount.name
      }`,
    );
    onSuccess(foundAccount.role);
    onClose();
  };

  return (
    <Modal title="تسجيل الدخول" onClose={onClose} className="modal-login">
      <div className="flex items-center justify-center gap-3 mb-5 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-[#073b59] text-teal-400 flex items-center justify-center shadow-xs shrink-0">
          <img src="./brand/icon.svg" alt="" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">منظومة فارما لينك</h3>
          <span className="text-[11px] font-medium text-slate-500">بوابة الدخول الموحدة للمنشآت</span>
        </div>
      </div>

      {errorMsg && (
        <div className="notice danger mb-4 flex items-center gap-2 text-xs py-2.5 px-3 rounded-lg">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="field">
          <span className="text-xs font-semibold text-slate-700">البريد الإلكتروني</span>
          <div className="relative">
            <input
              type="email"
              dir="ltr"
              placeholder="name@pharmacy.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full text-left pl-3 pr-10 h-10 text-sm rounded-lg"
            />
            <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="field">
          <span className="text-xs font-semibold text-slate-700">كلمة المرور</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              dir="ltr"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-left pl-3 pr-10 h-10 text-sm rounded-lg"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 p-1 cursor-pointer transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full justify-center h-10 text-sm font-bold shadow-sm flex items-center gap-2">
            <span>تسجيل الدخول</span>
            <ArrowLeft size={16} />
          </Button>
        </div>
      </form>

      <div className="mt-5 pt-3 border-t border-slate-100 text-center">
        <button
          type="button"
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline bg-transparent border-0 p-0 cursor-pointer"
          onClick={() => {
            onClose();
            onOpenRegister();
          }}
        >
          طلب تسجيل منشأة جديدة (KYC)
        </button>
      </div>
    </Modal>
  );
}
