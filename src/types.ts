export type Role = "engineer" | "releaser" | "instructor";

export type CheckResult = "normal" | "defect";

// 待复核 -> 已放行（锁定）；待复核 -> 已退回 -> 待复核（重新提交）
export type RecordStatus = "pending" | "returned" | "released";

export interface RecordEvent {
  at: string;
  actor: string;
  action: string;
  note?: string;
}

export interface InspectionRecord {
  id: string;
  aircraft: string;
  ata: string;
  zone: string;
  item: string;
  result: CheckResult;
  defect: string;
  disposition: string;
  engineer: string;
  createdAt: string;
  updatedAt: string;
  status: RecordStatus;
  returnReason?: string;
  releaser?: string;
  releasedAt?: string;
  history: RecordEvent[];
}

export interface RecordDraft {
  aircraft: string;
  ata: string;
  zone: string;
  item: string;
  result: CheckResult;
  defect: string;
  disposition: string;
  engineer: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  engineer: "维修工程师",
  releaser: "放行人员",
  instructor: "培训教员",
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  pending: "待复核",
  returned: "已退回",
  released: "已放行",
};

export const STATUS_ORDER: RecordStatus[] = ["pending", "returned", "released"];
