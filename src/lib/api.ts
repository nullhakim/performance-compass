// Base API client for Employee Performance Tracker
const BASE_URL = "http://70.153.137.117:8083/api";

type ApiSuccess<T> = { message: string; data: T };
type ApiError = { error: string; detail?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  let json: ApiSuccess<T> | ApiError;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Invalid JSON response (status ${res.status})`);
  }
  if (!res.ok || "error" in json) {
    const err = json as ApiError;
    throw new Error(err.detail || err.error || `Request failed (${res.status})`);
  }
  return (json as ApiSuccess<T>).data;
}

export interface Employee {
  id: number;
  name: string;
  position: string;
  office_location: string;
  entry_date: string;
}

export interface Product {
  id: number;
  name: string;
  category?: string;
}

export interface TargetDetail {
  target_id?: number;
  product_id?: number;
  product_name: string;
  nominal_target: number;
  total_achievement: number;
}

export interface PerformanceResult {
  total_target: number;
  total_achievement: number;
  percentage: number;
  details: TargetDetail[];
}

export interface Target {
  id: number;
  employee_id: number;
  employee_name?: string;
  product_id: number;
  product_name?: string;
  nominal: number;
  month: number;
  year: number;
}

export const api = {
  getEmployees: () => request<Employee[]>("/employees"),
  createEmployee: (body: Omit<Employee, "id">) =>
    request<Employee>("/employees", { method: "POST", body: JSON.stringify(body) }),
  getPerformance: (employeeId: number, month: number, year: number) =>
    request<PerformanceResult>(`/employees/${employeeId}/performance?month=${month}&year=${year}`),
  getProducts: () => request<Product[]>("/products"),
  getTargets: () => request<Target[]>("/targets"),
  createTarget: (body: { employee_id: number; product_id: number; nominal: number; month: number; year: number }) =>
    request<Target>("/targets", { method: "POST", body: JSON.stringify(body) }),
  createAchievement: (body: { target_id: number; nominal: number; description: string; closing_date: string }) =>
    request(`/achievements`, { method: "POST", body: JSON.stringify(body) }),
};

export function formatRupiah(value: number): string {
  if (value == null || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
