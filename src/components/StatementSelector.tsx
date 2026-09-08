import type { Statement } from "../services/api";

/* ISO "2026-07-25" → банковский "25.07.2026" в подписях опций. */
function fullDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
}

export default function StatementSelector({
  statements,
  currentId,
  onSelect,
}: {
  statements: Statement[];
  currentId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 text-base font-semibold text-[var(--text)]">Выписка</h2>
      <p className="mb-4 text-sm text-[var(--text-3)]">Аналитика и транзакции — по выбранной</p>
      {statements.length === 0 ? (
        <p className="text-sm text-[var(--text-4)]">Пока нет загруженных выписок</p>
      ) : (
        <select
          value={currentId ?? ""}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--field)] px-4 py-2.5 text-sm font-medium text-[var(--text)] outline-none transition focus:border-[var(--accent-border)]"
        >
          {statements.map((s) => (
            <option key={s.id} value={s.id} className="bg-[var(--field)] text-[var(--text)]">
              {s.file_name} · {s.transactions_count} оп.
              {s.period_from && s.period_to ? ` · ${fullDate(s.period_from)} — ${fullDate(s.period_to)}` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
