// Base API client for Employee Performance Tracker
const BASE_URL = "http://70.153.137.117:8083/api";

type ApiSuccess<T> = { message: string; data: T };
type ApiError = { error: string; detail?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const text = await res.text();
  let json: ApiSuccess<T> | ApiError | null = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
    }
  }
  if (!res.ok || (json && (json as ApiError).error)) {
    const err = (json as ApiError) || {};
    throw new Error(err.detail || err.error || `Request failed (${res.status})`);
  }
  return (json ? (json as ApiSuccess<T>).data : (undefined as T));
}

export type ID = string | number;

export interface Employee {
  id: ID;
  name: string;
  position: string;
  office_location: string;
  entry_date: string;
}

export interface Category {
  id: ID;
  name: string;
  normal_name?: string;
  created_at?: string;
}

export interface Product {
  id: ID;
  name: string;
  category_id?: ID;
  category?: Category | null;
}

export interface TargetDetail {
  target_id?: ID;
  product_id?: ID;
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
  id: ID;
  employee_id: ID;
  employee_name?: string;
  product_id: ID;
  product_name?: string;
  nominal: number;
  month: number;
  year: number;
}

export type EmployeeInput = Omit<Employee, "id">;
export type CategoryInput = { name: string };
export type ProductInput = { name: string; category_id: ID };

export const api = {
  // Employees
  getEmployees: () => request<Employee[]>("/employees"),
  createEmployee: (body: EmployeeInput) =>
    request<Employee>("/employees", { method: "POST", body: JSON.stringify(body) }),
  updateEmployee: (id: ID, body: EmployeeInput) =>
    request<Employee>(`/employees/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getPerformance: (employeeId: ID, month: number, year: number) =>
    request<PerformanceResult>(`/employees/${employeeId}/performance?month=${month}&year=${year}`),

  // Categories
  getCategories: () => request<Category[]>("/categories"),
  createCategory: (body: CategoryInput) =>
    request<Category>("/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: ID, body: CategoryInput) =>
    request<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  // Products
  getProducts: () => request<Product[]>("/products"),
  createProduct: (body: ProductInput) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: ID, body: ProductInput) =>
    request<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  // Targets & Achievements
  getTargets: () => request<Target[]>("/targets"),
  createTarget: (body: { employee_id: ID; product_id: ID; nominal: number; month: number; year: number }) =>
    request<Target>("/targets", { method: "POST", body: JSON.stringify(body) }),
  createAchievement: (body: { target_id: ID; nominal: number; description: string; closing_date: string }) =>
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

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
