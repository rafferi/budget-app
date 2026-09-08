import { useEffect, useState } from "react";
import {
  getErrorMessage,
  getMandatoryExpenses,
  getProfileTrend,
  type MandatoryExpensesResponse,
} from "../services/api";
import { toast } from "./Toast";
import {
  IconCard,
  IconHome,
  IconPhone,
  IconSubscription,
  IconUtilities,
} from "./Icons";

const fmtMoney = (n: number) => n.toLocaleString("ru-RU") + " ₽";

/* Иконка + плитка типа обязательного платежа: мягкий tint-фон
 * (8-12%) и насыщенная иконка того же hue — через CSS-переменные,
 * поэтому корректно в обеих темах. */
const TYPE_TILE: Record<string, { Icon: typeof IconHome; tile: string }> = {
  rent: {
    Icon: IconHome,
    tile: "bg-[var(--tile-rent-bg)] text-[var(--tile-rent-fg)]",
  },
  utilities: {
    Icon: IconUtilities,
    tile: "bg-[var(--tile-utilities-bg)] text-[var(--tile-utilities-fg)]",
  },
  subscription: {
    Icon: IconSubscription,
    tile: "bg-[var(--tile-subscription-bg)] text-[var(--tile-subscription-fg)]",
  },
  loan: {
    Icon: IconCard,
    tile: "bg-[var(--tile-loan-bg)] text-[var(--tile-loan-fg)]",
  },
  communication: {
    Icon: IconPhone,
    tile: "bg-[var(--tile-communication-bg)] text-[var(--tile-communication-fg)]",
  },
};

const FALLBACK_TILE = "bg-[var(--surface-3)] text-[var(--text-3)]";

function pluralPayments(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "платёж";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "платежа";
  return "платежей";
}

/* "2026-09-01" → "1 сент. 2026 г.": полная подпись для last_date. */
function fullDate(value: string): string {
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return value;
  return new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dt);
}

/* Глобальный блок "Обязательные расходы": регулярные платежи сразу по
 * всем выпискам скоупа. От currentStatementId не зависит — грузится при
 * монтировании; refreshKey инвалидирует после загрузки выписок
 * (App его же использует для аналитики, таблицы и истории).
 *
 * Средние месячные траты X для строки статистики берём из уже
 * существующего /profile/trend (сумма расходов / число месяцев):
 * backend average_monthly_mandatory отдельным endpoint'ом не отдаёт,
 * а ради одной цифры новый роут не заводим. Не загрузился тренд —
 * строка статистики просто скрывается, блок работает. */
export default function MandatoryExpensesBlock({
  refreshKey = 0,
  onPlanFreeMoney,
}: {
  refreshKey?: number;
  onPlanFreeMoney?: (amount: number) => void;
}) {
  const [data, setData] = useState<MandatoryExpensesResponse | null>(null);
  const [averageMonthlyExpenses, setAverageMonthlyExpenses] = useState<
    number | null
  >(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    getMandatoryExpenses()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          toast.error(
            getErrorMessage(e, "Не удалось загрузить обязательные расходы"),
          );
          setFailed(true);
        }
      });
    getProfileTrend()
      .then((res) => {
        if (cancelled || res.months.length === 0) return;
        const total = res.months.reduce((s, m) => s + m.expenses, 0);
        setAverageMonthlyExpenses(total / res.months.length);
      })
      .catch(() => {
        /* Тренд нужен только для строки статистики — молча скрываем её. */
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const expenses = data?.mandatory_expenses ?? [];
  const total = data?.total_monthly_mandatory ?? 0;
  const stat =
    data !== null && averageMonthlyExpenses !== null
      ? {
          average: Math.round(averageMonthlyExpenses),
          total: Math.round(total),
          free: Math.round(averageMonthlyExpenses - total),
        }
      : null;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)] backdrop-blur-2xl md:p-8">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-[var(--text)]">
          Обязательные расходы
        </h2>
        <span className="text-base text-[var(--text-3)]">на следующий месяц</span>
      </div>
      <p className="mb-6 text-sm text-[var(--text-3)]">
        Регулярные платежи, найденные автоматически по всем выпискам
      </p>

      {data === null && !failed && (
        <p className="py-2 text-sm text-[var(--text-4)]">Загрузка…</p>
      )}

      {failed && (
        <p className="py-2 text-sm text-[var(--danger)]">
          Не удалось загрузить обязательные расходы
        </p>
      )}

      {!failed && data !== null && expenses.length === 0 && (
        <p className="py-2 text-sm leading-relaxed text-[var(--text-3)]">
          Обязательных платежей не найдено. Загрузите выписки за несколько
          месяцев с регулярными платежами (аренда, ЖКХ, подписки), чтобы
          система могла их определить.
        </p>
      )}

      {!failed && data !== null && expenses.length > 0 && (
        <>
          <div className="divide-y divide-[var(--border-soft)]">
            {expenses.map((e, i) => {
              const tile = TYPE_TILE[e.type];
              const Icon = tile?.Icon ?? IconCard;

              return (
                <div
                  key={`${e.type}-${e.merchant}-${i}`}
                  className="flex items-center gap-3 py-3"
                >
                  <span
                    aria-hidden
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      tile?.tile ?? FALLBACK_TILE
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    {e.category}
                    {e.merchant !== "" && (
                      <span className="font-normal text-[var(--text-3)]">
                        {" "}
                        · {e.merchant}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-4)]">
                    {e.occurrences} {pluralPayments(e.occurrences)} ·
                    последний {fullDate(e.last_date)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text)]">
                  {fmtMoney(e.average_amount)}
                </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-[var(--border-strong)] pt-4">
            <p className="text-sm font-medium text-[var(--text-3)]">
              Итого в месяц
            </p>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-[var(--text)]">
              {fmtMoney(total)}
            </p>
          </div>

          {stat !== null && (
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-3)]">
              Средние траты — ~{fmtMoney(stat.average)}/мес. После
              обязательных (≈ {fmtMoney(stat.total)}) свободными останутся ≈{" "}
              {fmtMoney(stat.free)}.
            </p>
          )}

          {onPlanFreeMoney !== undefined && stat !== null && stat.free > 0 && (
            <button
              onClick={() => onPlanFreeMoney(stat.free)}
                className="mt-4 w-full rounded-full bg-gradient-to-r from-[#A8CF38] to-[#21A038] py-2.5 text-sm font-semibold text-[#050D0A] shadow-[0_0_28px_-8px_#21A038] transition hover:brightness-110"
              >
                Спланировать свободные деньги
              </button>
            )}
        </>
      )}
    </div>
  );
}
