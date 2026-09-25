import type { InspectionRecord, RecordDraft, ReviewAction } from "./types";

/**
 * 检查记录状态机：
 *   录入 ──▶ 待复核 ──放行──▶ 已放行（锁定，不可再变更）
 *                    └─退回──▶ 已退回 ──重新提交──▶ 待复核
 */

/** 新录入的检查项：保存为待复核 */
export function createRecord(draft: RecordDraft, id: string, now: string): InspectionRecord {
  return {
    id,
    ...draft,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
    releasedAt: null,
    releasedBy: null,
    reviews: [],
  };
}

/** 退回记录修改后重新提交：回到待复核；非退回状态不允许重提，返回 null */
export function resubmitRecord(
  record: InspectionRecord,
  draft: RecordDraft,
  now: string
): InspectionRecord | null {
  if (record.status !== "returned") return null;
  return { ...record, ...draft, status: "pending", submittedAt: now, updatedAt: now };
}

/** 复核：放行则锁定记录，退回则打回给工程师；非待复核状态不允许复核，返回 null */
export function applyReview(
  record: InspectionRecord,
  action: ReviewAction,
  name: string,
  comment: string,
  now: string
): InspectionRecord | null {
  if (record.status !== "pending") return null;
  const reviews = [...record.reviews, { action, by: name, at: now, comment }];
  if (action === "release") {
    return {
      ...record,
      status: "released",
      releasedAt: now,
      releasedBy: name,
      updatedAt: now,
      reviews,
    };
  }
  return { ...record, status: "returned", updatedAt: now, reviews };
}
