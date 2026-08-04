import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-backdrop flex min-h-screen items-center justify-center text-[13px] text-muted">
          読み込み中…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
