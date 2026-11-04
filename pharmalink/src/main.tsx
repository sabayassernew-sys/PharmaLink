import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProvider } from "./context";
import "./styles.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div dir="rtl" style={{ padding: 40, fontFamily: "Tahoma" }}>
        <h1>تعذر عرض الصفحة</h1>
        <p>أعد تحميل الصفحة. البيانات المحلية لا تُحذف بإعادة التحميل.</p>
        <button onClick={() => location.reload()}>إعادة المحاولة</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
