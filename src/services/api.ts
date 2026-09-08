/* Тонкий fetch-клиент backend FinBalance (Laravel).
 * Интерфейсы повторяют структуры backend 1-в-1, без адаптации под UI.
 * Адаптация под shape компонентов — в services/mappers.ts.
 */

export const API_BASE = "http://127.0.0.1:8000/api";

export interface Statement {
  id: number;
  file_name: string;
  file_type: string;
  period_from: string | null;
  period_to: string | null;
  transactions_count: number;
  created_at: string | null;
}

export interface PaginatorMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface StatementListResponse {
  data: Statement[];
  meta: PaginatorMeta;
}

export interface UploadResponse {
  data: Statement;
  imported_transactions_count: number;
}

export interface AnalyticsTotals {
  total_income: number;
  total_expenses: number;
  balance: number;
  average_expense: number;
  transactions_count: number;
}

export interface CategorySlice {
  category: string;
  amount: number;
  percentage: number;
  transaction_count: number;
}

export interface TimelinePoint {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface RecipientSlice {
  recipient: string;
  amount: number;
  transactions_count: number;
}

export interface LargestTransaction {
  amount: number;
  description: string | null;
  date: string | null;
  category: string | null;
}

export interface AnalyticsExtras {
  weekend_spending: number;
  weekday_spending: number;
  average_daily_spending: number;
  largest_transaction: LargestTransaction | null;
}

export interface AnalyticsResponse {
  totals: AnalyticsTotals;
  by_category: CategorySlice[];
  timeline: TimelinePoint[];
  top_recipients: RecipientSlice[];
  extras: AnalyticsExtras;
}

export type TransactionType = "credit" | "debit" | "transfer" | string;

export interface Transaction {
  id: number;
  date: string | null;
  amount: number;
  type: TransactionType | null;
  description: string | null;
  merchant: string | null;
  recipient: string | null;
  category: string | null;
  category_confidence: number | null;
}

export type TransactionFilters = {
  category?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  sort?: "asc" | "desc";
  page?: number;
  per_page?: number;
};

export interface TransactionListResponse {
  data: Transaction[];
  meta: PaginatorMeta;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(extractMessage(body) ?? `Ошибка запроса (статус ${status})`);
    this.status = status;
    this.body = body;
  }
}

/* Достаём человекочитаемый текст из тела ошибки backend:
 * 1) errors.* — первое сообщение валидации Laravel (у нас на русском);
 * 2) message — текст доменной ошибки backend (тоже на русском);
 * 3) иначе null — caller подставит fallback. */
function extractMessage(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;

  const errors = record.errors;
  if (typeof errors === "object" && errors !== null) {
    for (const value of Object.values(errors)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
      if (typeof value === "string") return value;
    }
  }

  if (typeof record.message === "string" && record.message !== "") {
    return record.message;
  }

  return null;
}

/* Единая точка получения текста ошибки для UI: осмысленный message
 * из ApiError, иначе — переданный fallback (тоже человекочитаемый). */
export function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message !== "") return e.message;
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    });
  } catch {
    throw new ApiError(
      0,
      { message: "Не удалось соединиться с сервером. Проверьте, что backend запущен." },
    );
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    // Протухший/битый токен посреди сессии: чистим локально и отдаём
    // управление в App через зарегистрированный колбэк (экран входа).
    // Сами login/register из-под правила исключены — их 401/422
    // обрабатывает форма входа, а не глобальный разлогин.
    if (res.status === 401 && !isAuthPath(path)) {
      clearToken();
      unauthorizedHandler?.();
    }
    throw new ApiError(res.status, body);
  }

  return body as T;
}

/* ---------- Авторизация (Sanctum, Bearer) ---------- */

const TOKEN_KEY = "finbalance_token";

const AUTH_PATHS = ["/auth/login", "/auth/register"];

function isAuthPath(path: string): boolean {
  return AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`));
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* приватный режим и т.п. — сессия просто не переживёт перезагрузку */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/* App регистрирует переход в anonymous при 401 посреди сессии. */
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  unauthorizedHandler = fn;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      ...(name !== undefined && name !== "" ? { name } : {}),
    }),
  });
  setToken(res.token);

  return res;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  setToken(res.token);

  return res;
}

export async function logout(): Promise<void> {
  try {
    await request("/auth/logout", { method: "POST" });
    clearToken();
  } catch (e) {
    // 401 здесь тоже означает «сессия мертва» — токен уже сброшен
    // глобальным обработчиком выше; сеть же — не повод разлогинивать.
    if (e instanceof ApiError && e.status === 401) clearToken();
    throw e;
  }
}

export function getMe(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>("/auth/me");
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listStatements(page = 1): Promise<StatementListResponse> {
  return request<StatementListResponse>(`/statements${toQuery({ page })}`);
}

export function uploadStatement(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResponse>("/statements/upload", {
    method: "POST",
    body: form,
  });
}

export function getAnalytics(id: number): Promise<AnalyticsResponse> {
  return request<AnalyticsResponse>(`/statements/${id}/analytics`);
}

export function getTransactions(
  id: number,
  filters: TransactionFilters = {},
): Promise<TransactionListResponse> {
  return request<TransactionListResponse>(
    `/statements/${id}/transactions${toQuery(filters)}`,
  );
}

export type InsightType =
  | "аномалия"
  | "подписка"
  | "рост_расходов"
  | "главная_категория"
  | "временной_паттерн"
  | "recommendation";

export type RecommendationPriority = "high" | "medium" | "low";

export interface RecommendationData {
  recommendation: string;
  priority: RecommendationPriority;
  category: string;
  reduction_percentage: number;
  monthly_saving: number;
  annual_saving: number;
}

export interface AiInsight {
  id: number;
  type: InsightType | string;
  title: string;
  description: string;
  data: RecommendationData | Record<string, never>;
  potential_saving: number | null;
  created_at: string | null;
}

export interface AiAnalyzeResponse {
  data: AiInsight[];
  from_cache: boolean;
}

export interface AiInsightsResponse {
  data: AiInsight[];
}

export function isRecommendation(
  insight: AiInsight,
): insight is AiInsight & { data: RecommendationData } {
  return insight.type === "recommendation";
}

export function analyzeStatement(id: number, force = false): Promise<AiAnalyzeResponse> {
  return request<AiAnalyzeResponse>(
    `/statements/${id}/ai/analyze${toQuery({ force: force ? "true" : undefined })}`,
    { method: "POST" },
  );
}

export function getAiInsights(id: number): Promise<AiInsightsResponse> {
  return request<AiInsightsResponse>(`/statements/${id}/ai/insights`);
}

export interface PlanDistributionItem {
  category: string;
  current_amount: number;
  reduction_percentage: number;
  monthly_saving: number;
}

export interface SavingsPlanResponse {
  target_monthly_saving: number;
  achievable_monthly_saving: number;
  achievable_annual_saving: number;
  reachable: boolean;
  source: "ai" | "fallback";
  distribution: PlanDistributionItem[];
}

export function requestSavingsPlan(
  id: number,
  targetMonthlySaving: number,
): Promise<SavingsPlanResponse> {
  return request<SavingsPlanResponse>(`/statements/${id}/savings-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ target_monthly_saving: targetMonthlySaving }),
  });
}

export interface ReceiptScanResult {
  date: string;
  merchant: string;
  amount: number;
  suggested_category: string;
  category_confidence: number;
}

export interface ReceiptConfirmData {
  date: string;
  merchant: string;
  amount: number;
  category: string;
}

export interface ReceiptConfirmResponse {
  data: Transaction;
  message: string;
}

export function scanReceipt(id: number, file: File): Promise<ReceiptScanResult> {
  const form = new FormData();
  form.append("receipt", file);
  return request<ReceiptScanResult>(`/statements/${id}/receipts/scan`, {
    method: "POST",
    body: form,
  });
}

export function confirmReceipt(
  id: number,
  data: ReceiptConfirmData,
): Promise<ReceiptConfirmResponse> {
  return request<ReceiptConfirmResponse>(`/statements/${id}/receipts/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
}

export function sendChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ message, history }),
  });
}

export interface CategoriesResponse {
  expense: string[];
  income: string[];
}

export function getCategories(): Promise<CategoriesResponse> {
  return request<CategoriesResponse>("/categories");
}

export async function downloadReport(statementId: number): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/statements/${statementId}/report/pdf`, {
      headers,
    });
  } catch {
    throw new ApiError(0, {
      message: "Не удалось соединиться с сервером. Проверьте, что backend запущен.",
    });
  }

  if (!res.ok) {
    if (res.status === 401 && !isAuthPath("/statements")) {
      clearToken();
      unauthorizedHandler?.();
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, body);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finbalance-report-${statementId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Глобальный тренд по всем выпискам скоупа (не привязан к одной выписке).
 * month — календарный месяц "YYYY-MM", сортировка по возрастанию — с backend. */
export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  transactions_count: number;
}

export interface ProfileTrendResponse {
  months: MonthlyTrend[];
}

export function getProfileTrend(): Promise<ProfileTrendResponse> {
  return request<ProfileTrendResponse>("/profile/trend");
}

/* Обязательные ежемесячные платежи по всем выпискам скоупа.
 * Детектор — эвристический (backend), типы повторяют ответ 1-в-1. */
export type MandatoryExpenseType =
  | "subscription"
  | "utilities"
  | "rent"
  | "loan"
  | "communication";

export interface MandatoryExpense {
  type: MandatoryExpenseType | string;
  category: string;
  merchant: string;
  average_amount: number;
  frequency: string;
  occurrences: number;
  last_date: string;
  monthly_total: number;
}

export interface MandatoryExpensesSummary {
  subscriptions_count: number;
  subscriptions_total: number;
  utilities_total: number;
  rent_total: number;
  loans_total: number;
  communication_total: number;
}

export interface MandatoryExpensesResponse {
  mandatory_expenses: MandatoryExpense[];
  total_monthly_mandatory: number;
  summary: MandatoryExpensesSummary;
}

export function getMandatoryExpenses(): Promise<MandatoryExpensesResponse> {
  return request<MandatoryExpensesResponse>("/profile/mandatory-expenses");
}

export interface ManualTransactionData {
  date: string;
  description: string;
  amount: number;
  category: string;
  type: "debit" | "credit";
}

export function createManualTransaction(
  id: number,
  data: ManualTransactionData,
): Promise<ReceiptConfirmResponse> {
  return request<ReceiptConfirmResponse>(`/statements/${id}/transactions/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });
}
