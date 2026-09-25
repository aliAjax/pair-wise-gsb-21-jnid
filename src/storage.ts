import type { InspectionRecord, Role } from "./types";
import { buildSeedRecords } from "./data";

const RECORDS_KEY = "hxwl07.inspection-records.v1";
const ROLE_KEY = "hxwl07.role";
const ENGINEER_KEY = "hxwl07.engineer-name";
const INSPECTOR_KEY = "hxwl07.inspector-name";

export function loadRecords(): InspectionRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) {
      const seeds = buildSeedRecords();
      saveRecords(seeds);
      return seeds;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is InspectionRecord =>
        typeof item === "object" && item !== null && "id" in item && "status" in item
    );
  } catch {
    return [];
  }
}

export function saveRecords(records: InspectionRecord[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // 存储不可用（如隐私模式）时静默失败，页面内状态仍然有效
  }
}

export function clearRecords(): void {
  try {
    localStorage.removeItem(RECORDS_KEY);
  } catch {
    // ignore
  }
}

export function loadRole(): Role {
  try {
    return localStorage.getItem(ROLE_KEY) === "inspector" ? "inspector" : "engineer";
  } catch {
    return "engineer";
  }
}

export function saveRole(role: Role): void {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    // ignore
  }
}

export function loadName(kind: "engineer" | "inspector"): string {
  try {
    return localStorage.getItem(kind === "engineer" ? ENGINEER_KEY : INSPECTOR_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveName(kind: "engineer" | "inspector", name: string): void {
  try {
    localStorage.setItem(kind === "engineer" ? ENGINEER_KEY : INSPECTOR_KEY, name);
  } catch {
    // ignore
  }
}
