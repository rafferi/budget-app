import { useState } from "react";
import {
  getErrorMessage,
  login,
  register,
  type AuthUser,
} from "../services/api";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--field)] px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-4)] outline-none transition focus:border-[var(--accent-border)]";

/* Экран входа/регистрации. Чисто презентационный: вся работа
 * с токеном — внутри api.ts (login/register сами сохраняют токен),
 * сюда наружу отдаём только пользователя. */
export default function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit() {
    if (busy) return;
    if (email.trim() === "" || password === "") {
      setError("Заполните email и пароль.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await login(email.trim(), password)
          : await register(email.trim(), password, name.trim());
      onAuthenticated(res.user);
    } catch (e) {
      setError(getErrorMessage(e, "Не удалось войти. Попробуйте позже."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)] backdrop-blur-2xl md:p-8">
        <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">
          FinBalance
        </h2>
        <p className="mb-6 mt-1 text-sm text-[var(--text-3)]">
          Войдите, чтобы увидеть свои выписки
        </p>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
          <button
            onClick={() => switchMode("login")}
            className={`rounded-full py-1.5 text-sm font-medium transition ${
              mode === "login"
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-4)] hover:text-[var(--text-2)]"
            }`}
          >
            Вход
          </button>
          <button
            onClick={() => switchMode("register")}
            className={`rounded-full py-1.5 text-sm font-medium transition ${
              mode === "register"
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-4)] hover:text-[var(--text-2)]"
            }`}
          >
            Регистрация
          </button>
        </div>

        <div className="space-y-3">
          {mode === "register" && (
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--text-3)]">
                Имя (необязательно)
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как к вам обращаться"
                className={inputClass}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-3)]">Эл. почта</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="you@example.com"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-3)]">
              Пароль{mode === "register" ? " (минимум 8 символов)" : ""}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="••••••••"
              className={inputClass}
            />
          </label>
        </div>

        {error !== null && (
          <p className="mt-4 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-sm leading-relaxed text-[var(--danger)]">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-5 w-full rounded-full bg-gradient-to-r from-[#A8CF38] to-[#21A038] py-2.5 text-sm font-semibold text-[#050D0A] shadow-[0_0_28px_-8px_#21A038] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        <p className="mt-6 border-t border-[var(--border-soft)] pt-4 text-center text-xs leading-relaxed text-[var(--text-4)]">
          Демо-доступ: demo@finbalance.ru / demo12345
        </p>
      </div>
    </div>
  );
}
