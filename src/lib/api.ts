export const API_BASE = import.meta.env.VITE_API_URL as string ?? "https://hamshirago-production-0a65.up.railway.app";
export const WS_URL = API_BASE;

// ── Types ──────────────────────────────────────────────────────────────────────

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "ARRIVED"
  | "SERVICE_STARTED"
  | "DONE"
  | "CANCELED";

export interface AdminMedic {
  id: string;
  name: string | null;
  phone: string;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  rating: number | null;
  balance: number | string;
  isBlocked: boolean;
  experienceYears: number;
  reviewCount: number;
  facePhotoUrl: string | null;
  licensePhotoUrl: string | null;
  created_at: string;
  workZoneLat: number | null;
  workZoneLng: number | null;
  workZoneRadius: number | null;
}

export interface AdminUser {
  id: string;
  name: string | null;
  phone: string;
  isBlocked: boolean;
  created_at: string;
}

export interface OrderLocation {
  house: string;
  latitude: number;
  longitude: number;
  phone: string;
  floor: string | null;
  apartment: string | null;
}

export interface AdminOrder {
  id: string;
  clientId: string;
  medicId: string | null;
  serviceTitle: string;
  priceAmount: number;
  discountAmount: number;
  platformFee: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  location: OrderLocation;
}

export interface AdminService {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceFormData {
  title: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  sortOrder: number;
}

// ── Token storage ─────────────────────────────────────────────────────────────

function getAdminToken(): string {
  return localStorage.getItem("admin_token") ?? "";
}

export function setAdminToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearAdminToken() {
  localStorage.removeItem("admin_token");
}

export function hasAdminToken(): boolean {
  const token = localStorage.getItem("admin_token");
  if (!token) return false;
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(token.split(".")[1].length / 4) * 4, "=");
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function adminLogin(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.status === 401) throw new Error("Неверный логин или пароль");
  if (!res.ok) throw new Error("Ошибка сервера. Попробуйте позже.");

  const data = await res.json() as { access_token: string };
  setAdminToken(data.access_token);
}

// ── Request helper ────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  requiresAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (requiresAuth) {
    headers["Authorization"] = `Bearer ${getAdminToken()}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearAdminToken();
    window.dispatchEvent(new CustomEvent("admin:unauthorized"));
    throw new Error("Unauthorized");
  }

  if (res.status === 204) return null as T;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Paginated response ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Aliases kept for backwards compatibility with old exports
export type MedicsResponse = PaginatedResponse<AdminMedic>;
export type UsersResponse = PaginatedResponse<AdminUser>;
export type OrdersResponse = PaginatedResponse<AdminOrder>;

// ── Medics ────────────────────────────────────────────────────────────────────

export const getPendingMedics = () =>
  request<AdminMedic[]>("GET", "/medics/admin/pending");

export const getAllMedics = (
  page = 1,
  limit = 20,
  search?: string,
  verificationStatus?: string,
  isBlocked?: boolean,
  isOnline?: boolean,
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (verificationStatus) params.set("verificationStatus", verificationStatus);
  if (isBlocked != null) params.set("isBlocked", String(isBlocked));
  if (isOnline != null) params.set("isOnline", String(isOnline));
  return request<MedicsResponse>("GET", `/medics/admin/all?${params}`);
};

export const verifyMedic = (id: string, status: "APPROVED" | "REJECTED", reason?: string) =>
  request<void>("PATCH", `/medics/admin/${id}/verify`, { status, reason });

export const blockMedic = (id: string, isBlocked: boolean) =>
  request<void>("PATCH", `/medics/admin/${id}/block`, { isBlocked });

// ── Users (Clients) ───────────────────────────────────────────────────────────

export const getUsers = (page = 1, limit = 20, search?: string, isBlocked?: boolean) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (isBlocked != null) params.set("isBlocked", String(isBlocked));
  return request<UsersResponse>("GET", `/auth/admin/users?${params}`);
};

export const blockClient = (id: string, isBlocked: boolean) =>
  request<void>("PATCH", `/auth/admin/users/${id}/block`, { isBlocked });

// ── Orders ────────────────────────────────────────────────────────────────────

export const getOrders = (page = 1, limit = 20, status?: string) => {
  let path = `/orders/admin/all?page=${page}&limit=${limit}`;
  if (status) path += `&status=${status}`;
  return request<OrdersResponse>("GET", path);
};

export const cancelOrder = (id: string) =>
  request<void>("PATCH", `/orders/admin/${id}/cancel`);

// ── Services ──────────────────────────────────────────────────────────────────

export const getServices = () =>
  request<AdminService[]>("GET", "/services", undefined, false);

export const createService = (data: ServiceFormData) =>
  request<AdminService>("POST", "/services", data);

export const updateService = (id: string, data: Partial<ServiceFormData> & { isActive?: boolean }) =>
  request<AdminService>("PATCH", `/services/${id}`, data);

export const deleteService = (id: string) =>
  request<void>("DELETE", `/services/${id}`);

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorRole: "client" | "medic";
  targetRole: "medic" | "client";
}

export const getMedicReviews = (medicId: string) =>
  request<Review[]>("GET", `/reviews/medic/${medicId}`);

export const getClientReviews = (clientId: string) =>
  request<Review[]>("GET", `/reviews/client/${clientId}`);

// ── Medic balance top-up ──────────────────────────────────────────────────────

export const topupMedic = (id: string, amount: number) =>
  request<void>("POST", `/medics/admin/${id}/topup`, { amount });

// ── App Settings ──────────────────────────────────────────────────────────────

export interface AppSettings {
  isPaidMode: boolean;
  commissionRate: number;
  urgentFeePercent: number;
  urgentStartHour: number;
  urgentEndHour: number;
}

export const getSettings = () =>
  request<AppSettings>("GET", "/settings");

export const updateSettings = (data: Partial<AppSettings>) =>
  request<AppSettings>("PATCH", "/settings", data);

// ── Client Errors (User Support) ──────────────────────────────────────────────

export interface ClientError {
  id: string;
  message: string;
  stack?: string | null;
  errorCode?: string | null;
  userId?: string | null;
  appType?: string | null;
  appVersion?: string | null;
  url?: string | null;
  deviceInfo?: string | null;
  status: string;
  count?: number;
  createdAt: string;
}

export interface ClientErrorStats {
  NEW: number;
  IN_PROGRESS: number;
  FIXED: number;
  IGNORED: number;
}

export const getClientErrors = (params: { page?: number; limit?: number; status?: string }) => {
  const q = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 20) });
  if (params.status) q.set("status", params.status);
  return request<PaginatedResponse<ClientError>>("GET", `/client-errors/admin?${q}`);
};

export const updateClientErrorStatus = (id: string, status: string) =>
  request<void>("PATCH", `/client-errors/admin/${id}`, { status });

// ── NPS ───────────────────────────────────────────────────────────────────────

export interface NpsMonthStat {
  month: string;
  nps: number;
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
}

export interface NpsStats {
  overall: NpsMonthStat;
  monthly: NpsMonthStat[];
}

export const getNpsStats = () => request<NpsStats>("GET", "/nps/admin/stats");

// ── Consultations (Admin) ─────────────────────────────────────────────────────

export interface AdminConsultation {
  id: string;
  clientId: string;
  doctorId: string;
  doctor: { id: string; name: string; specialization: string } | null;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELED";
  symptoms: string | null;
  doctorNotes: string | null;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export const getAdminConsultations = (page = 1, limit = 20, status?: string) => {
  let path = `/consultations/admin/all?page=${page}&limit=${limit}`;
  if (status) path += `&status=${status}`;
  return request<PaginatedResponse<AdminConsultation>>("GET", path);
};

export const completeConsultation = (
  id: string,
  doctorNotes?: string,
  createOrderServiceId?: string,
) =>
  request<AdminConsultation & { prescription?: unknown }>("PATCH", `/consultations/admin/${id}/complete`, {
    ...(doctorNotes ? { doctorNotes } : {}),
    ...(createOrderServiceId ? { createOrderServiceId } : {}),
  });

export const cancelAdminConsultation = (id: string) =>
  request<void>("PATCH", `/consultations/admin/${id}/cancel`);

export const getClientErrorStats = () =>
  request<ClientErrorStats>("GET", "/client-errors/admin/stats");

// ── Promo Codes ───────────────────────────────────────────────────────────────

export interface AdminPromoCode {
  id: string;
  code: string;
  discountAmount: number | null;
  discountPercent: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePromoCodeDto {
  code: string;
  discountAmount?: number;
  discountPercent?: number;
  maxUses?: number;
  expiresAt?: string;
}

export const getPromoCodes = () =>
  request<AdminPromoCode[]>("GET", "/promo/admin");

export const createPromoCode = (dto: CreatePromoCodeDto) =>
  request<AdminPromoCode>("POST", "/promo/admin", dto);

export const deactivatePromoCode = (id: string) =>
  request<AdminPromoCode>("PATCH", `/promo/admin/${id}/deactivate`);

// ── Subscription Tiers ────────────────────────────────────────────────────────

export interface AdminSubscriptionTier {
  id: string;
  name: string;
  nameUz: string;
  description: string;
  price: number;
  billingDays: number;
  maxOrders: number;
  discountPercent: number;
  isActive: boolean;
  sortOrder: number;
}

export interface SubscriptionStats {
  active: number;
  expired: number;
  canceled: number;
}

export interface SubscriptionTierFormData {
  name: string;
  nameUz: string;
  description: string;
  price: number;
  billingDays: number;
  maxOrders: number;
  discountPercent: number;
  isActive: boolean;
  sortOrder: number;
}

export const getAdminTiers = () =>
  request<AdminSubscriptionTier[]>("GET", "/subscriptions/admin/tiers");

export const createTier = (data: SubscriptionTierFormData) =>
  request<AdminSubscriptionTier>("POST", "/subscriptions/admin/tiers", data);

export const updateTier = (id: string, data: Partial<SubscriptionTierFormData>) =>
  request<AdminSubscriptionTier>("PATCH", `/subscriptions/admin/tiers/${id}`, data);

export const getSubscriptionStats = () =>
  request<SubscriptionStats>("GET", "/subscriptions/admin/stats");

// ── Doctors (Admin) ───────────────────────────────────────────────────────────

export interface AdminDoctor {
  id: string;
  name: string;
  nameUz: string;
  specialization: string;
  specializationUz: string;
  bio: string | null;
  photoUrl: string | null;
  pricePerConsultation: number;
  phone: string | null;
  rating: number | null;
  consultationCount: number;
  isActive: boolean;
}

export interface DoctorFormData {
  name: string;
  nameUz: string;
  specialization: string;
  specializationUz: string;
  bio: string;
  photoUrl: string;
  pricePerConsultation: number;
  phone: string;
  isActive: boolean;
}

export const getAdminDoctors = () =>
  request<AdminDoctor[]>("GET", "/consultations/admin/doctors");

export const createDoctor = (data: DoctorFormData) =>
  request<AdminDoctor>("POST", "/consultations/admin/doctors", data);

export const updateDoctor = (id: string, data: Partial<DoctorFormData>) =>
  request<AdminDoctor>("PATCH", `/consultations/admin/doctors/${id}`, data);

// ── Doctor Accounts (V5 auth doctors) ────────────────────────────────────────

export interface DoctorAccount {
  id: string;
  name: string;
  phone: string;
  specialization: string | null;
  experienceYears: number;
  isOnline: boolean;
  isBlocked: boolean;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  profilePhotoUrl: string | null;
  rating: number | null;
  reviewCount: number;
  createdAt: string;
}

export interface DoctorAccountsResponse {
  data: DoctorAccount[];
  total: number;
  page: number;
  totalPages: number;
}

export const getDoctorAccounts = (page = 1, limit = 20, search?: string, verificationStatus?: string, isBlocked?: boolean) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (verificationStatus) params.set("verificationStatus", verificationStatus);
  if (isBlocked !== undefined) params.set("isBlocked", String(isBlocked));
  return request<DoctorAccountsResponse>("GET", `/doctors/admin/all?${params}`);
};

export const getDoctorAccountsPending = () =>
  request<DoctorAccount[]>("GET", "/doctors/admin/pending");

export const verifyDoctorAccount = (id: string, status: "APPROVED" | "REJECTED", reason?: string) =>
  request<DoctorAccount>("PATCH", `/doctors/admin/${id}/verify`, { status, ...(reason ? { reason } : {}) });

export const blockDoctorAccount = (id: string, isBlocked: boolean) =>
  request<void>("PATCH", `/doctors/admin/${id}/block`, { isBlocked });

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export const getAuditLog = (page = 1, limit = 20, action?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (action) params.set("action", action);
  return request<AuditLogResponse>("GET", `/admin/audit-log?${params}`);
};

// ── Voice Agent ───────────────────────────────────────────────────────────────

export interface VoiceAgentStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  doctorRecommendations: number;
  nurseRecommendations: number;
  conversionRate: number;
  averageExchanges: number;
}

export interface VoiceSession {
  id: string;
  clientId: string;
  lang: string;
  status: "ACTIVE" | "COMPLETED";
  recommendation: "DOCTOR" | "NURSE" | "NONE" | null;
  suggestedSpecialization: string | null;
  messages: { role: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSessionsResponse {
  data: VoiceSession[];
  total: number;
  page: number;
  totalPages: number;
}

export const getVoiceAgentStats = () =>
  request<VoiceAgentStats>("GET", "/voice-agent/admin/sessions/stats");

export const getVoiceSessions = (page = 1, limit = 20, status?: string, recommendation?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (recommendation) params.set("recommendation", recommendation);
  return request<VoiceSessionsResponse>("GET", `/voice-agent/admin/sessions?${params}`);
};

export const getVoiceSession = (id: string) =>
  request<VoiceSession>("GET", `/voice-agent/admin/sessions/${id}`);

// ── Salomat Audit ─────────────────────────────────────────────────────────────

export interface SalomatAuditStats {
  totalEvents: number;
  redFlags: number;
  doctorReferrals: number;
  nurseReferrals: number;
  safeguards: number;
  rateLimits: number;
  topSpecializations: Array<{ specialization: string; count: number }>;
}

export const getSalomatAuditStats = (days = 30) =>
  request<SalomatAuditStats>("GET", `/consultations/admin/salomat-audit/stats?days=${days}`);

// ── AI Analytics ─────────────────────────────────────────────────────────────

export async function aiChat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await request<{ reply: string }>("POST", "/analytics/ai-chat", { messages });
  return res.reply;
}

export async function getFeedbackSummary(): Promise<{ summary: string; stats: Record<string, number> }> {
  return request("GET", "/analytics/feedback-summary");
}

export async function getTopIssues(): Promise<{ issues: string }> {
  return request("GET", "/analytics/top-issues");
}

// ── Clinic Companies ──────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  legalName: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  isVerified: boolean;
  isActive: boolean;
  pilotEnded: boolean;
  createdAt: string;
  _count?: { staff: number; salomatLeads: number };
}

export interface CompaniesResponse {
  data: Company[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateCompanyDto {
  name: string;
  legalName?: string;
  phone: string;
  address?: string;
  city?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  ceoName: string;
  ceoPhone: string;
  ceoPassword: string;
}

export const getCompanies = (
  page = 1,
  limit = 20,
  city?: string,
  isVerified?: boolean,
  isActive?: boolean,
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (city) params.set("city", city);
  if (isVerified !== undefined) params.set("isVerified", String(isVerified));
  if (isActive !== undefined) params.set("isActive", String(isActive));
  return request<CompaniesResponse>("GET", `/admin/companies?${params}`);
};

export const createCompany = (dto: CreateCompanyDto) =>
  request<Company>("POST", "/admin/companies", dto);

export const verifyCompany = (id: string, isVerified: boolean) =>
  request<Company>("PATCH", `/admin/companies/${id}/verify`, { isVerified });

export const blockCompany = (id: string, isActive: boolean) =>
  request<Company>("PATCH", `/admin/companies/${id}/block`, { isActive });

export const getCompany = (id: string) =>
  request<Company>("GET", `/admin/companies/${id}`);

export interface CompanyStaffMember {
  id: string;
  name: string;
  phone: string;
  role: "CEO" | "RECEPTION" | "DOCTOR";
  isActive: boolean;
  createdAt: string;
}

export const getCompanyStaff = (id: string) =>
  request<CompanyStaffMember[]>("GET", `/admin/companies/${id}/staff`);

export const getCompanyMonthlyStats = (id: string) =>
  request<Array<{ month: string; patientCount: number }>>("GET", `/admin/companies/${id}/stats/monthly`);

export interface AdminLead {
  id: string;
  clinicId: string;
  patientName: string;
  patientPhone: string;
  specialization: string | null;
  aiSummary: string | null;
  status: "NEW" | "CONTACTED" | "BOOKED" | "VISITED" | "MISSED";
  commissionAmount: number | null;
  createdAt: string;
  clinic?: { id: string; name: string };
}

export interface AdminLeadsResponse {
  data: AdminLead[];
  total: number;
  page: number;
  totalPages: number;
}

export interface LeadsOverview {
  totalLeads: number;
  byStatus: Array<{ status: string; count: number }>;
  conversionRate: number;
  totalCommission: number;
}

export const getLeadsOverview = () =>
  request<LeadsOverview>("GET", "/admin/leads/overview");

export const getAdminLeads = (
  page = 1,
  limit = 20,
  clinicId?: string,
  status?: string,
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (clinicId) params.set("clinicId", clinicId);
  if (status) params.set("status", status);
  return request<AdminLeadsResponse>("GET", `/admin/leads?${params}`);
};
