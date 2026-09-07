import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getErrorMessage,
  getProfileTrend,
  type MonthlyTrend,
} from "../services/api";
import { toast } from "./Toast";

const fmtMoney = (n: number) => n.toLocaleString("ru-RU") + " ₽";

/* "2026-05" → "май 2026": та же техника, что shortDate в App.tsx
 * (Intl.DateTimeFormat ru, short month). Хвост " г." отрезаем.
 * Не-YYYY-MM значения (на всякий случай) отдаём как есть. */
function shortMonth(value: string | number): string {
  if (typeof value !== "string") return String(value);
  const dt = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return new Intl.DateTimeFormat("ru", { month: "short", year: "numeric" })
    .format(dt)
    .replace(/\s*г\.$/, "");
}

/* Короткие подписи оси сумм ("9к" вместо "8722.95") — в духе App.tsx. */
function shortAxisMoney(value: number): string {
  return value >= 1000 ? `${Math.round(value / 1000)}к` : `${value}`;
}

const axisTick = { fontSize: 12, fill: "var(--chart-axis)" };
const tooltipStyle = {
  background: "var(--overlay)",
  border: "1px solid var(--border-strong)",
  borderRadius: 12,
  color: "var(--text)",
  fontSize: 13,
  backdropFilter: "blur(12px)",
};

/* Глобальный блок "История": доходы/расходы по месяцам сразу по всем
 * выпискам скоупа. От currentStatementId не зависит — грузится один раз
 * при монтировании; refreshKey инвалидирует после загрузки/добавления
 * операций (App его же использует для аналитики и таблицы). */
export default function FinancialHistoryChart({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [months, setMonths] = useState<MonthlyTrend[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMonths(null);
    setFailed(false);
    getProfileTrend()
      .then((res) => {
        if (!cancelled) setMonths(res.months);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          toast.error(getErrorMessage(e, "Не удалось загрузить историю"));
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)] backdrop-blur-2xl md:p-8">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-[var(--text)]">История</h2>
        <span className="text-base text-[var(--text-3)]">по всем выпискам</span>
      </div>
      <p className="mb-6 text-sm text-[var(--text-3)]">
        Доходы и расходы по месяцам — общая картина перед деталями по выписке
      </p>

      {months === null && !failed && (
        <p className="py-2 text-sm text-[var(--text-4)]">Загрузка...</p>
      )}

      {failed && (
        <p className="py-2 text-sm text-[var(--danger)]">
          Не удалось загрузить историю
        </p>
      )}

      {!failed && months !== null && months.length === 0 && (
        <p className="py-2 text-sm leading-relaxed text-[var(--text-3)]">
          Пока нет данных для отображения истории
        </p>
      )}

      {!failed && months !== null && months.length === 1 && (
        <p className="py-2 text-sm leading-relaxed text-[var(--text-3)]">
          Загрузите выписки за разные месяцы, чтобы увидеть динамику
        </p>
      )}

      {!failed && months !== null && months.length >= 2 && (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={months}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                barGap={4}
              >
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={axisTick}
                  tickFormatter={shortMonth}
                  interval={months.length <= 6 ? 0 : 1}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={axisTick}
                  tickFormatter={(v) => shortAxisMoney(Number(v))}
                  width={44}
                />
                <Tooltip
                  formatter={(v) => fmtMoney(Number(v ?? 0))}
                  labelFormatter={(label) =>
                    typeof label === "string" || typeof label === "number"
                      ? shortMonth(label)
                      : label
                  }
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="income"
                  name="Доходы"
                  fill="var(--chart-line)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                />
                <Bar
                  dataKey="expenses"
                  name="Расходы"
                  fill="var(--danger)"
                  fillOpacity={0.7}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-5 text-sm">
            <span className="flex items-center gap-2 text-[var(--text-3)]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--chart-line)" }}
              />
              Доходы
            </span>
            <span className="flex items-center gap-2 text-[var(--text-3)]">
              <span
                className="h-2.5 w-2.5 rounded-full opacity-70"
                style={{ background: "var(--danger)" }}
              />
              Расходы
            </span>
            <span className="ml-auto text-xs text-[var(--text-4)]">
              {months.length} мес.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
