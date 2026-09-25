export type Role = "engineer" | "inspector";

export type CheckResult = "normal" | "defect";

/** 待复核 → 已放行(锁定) / 已退回 → 重新提交 → 待复核 */
export type RecordStatus = "pending" | "released" | "returned";

export type ReviewAction = "release" | "return";

export interface ReviewEvent {
  action: ReviewAction;
  by: string;
  at: string;
  comment: string;
}

export interface InspectionRecord {
  id: string;
  aircraftType: string;
  ataChapter: string;
  area: string;
  item: string;
  result: CheckResult;
  defectDesc: string;
  actionPlan: string;
  engineer: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  releasedAt: string | null;
  releasedBy: string | null;
  reviews: ReviewEvent[];
}

export interface RecordDraft {
  aircraftType: string;
  ataChapter: string;
  area: string;
  item: string;
  result: CheckResult;
  defectDesc: string;
  actionPlan: string;
  engineer: string;
}

export const STATUS_META: Record<RecordStatus, { label: string; className: string }> = {
  pending: { label: "待复核", className: "badge-pending" },
  released: { label: "已放行", className: "badge-released" },
  returned: { label: "已退回", className: "badge-returned" },
};

export const RESULT_META: Record<CheckResult, { label: string; className: string }> = {
  normal: { label: "正常", className: "result-normal" },
  defect: { label: "缺陷", className: "result-defect" },
};
