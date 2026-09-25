import type { RecordDraft } from "./types";

/** 录入校验：必填字段齐全，且缺陷项必须写明缺陷描述和处理意见才能提交复核 */
export function validateDraft(draft: RecordDraft): string[] {
  const errors: string[] = [];
  if (!draft.aircraftType.trim()) errors.push("请填写机型");
  if (!draft.ataChapter) errors.push("请选择 ATA 章节");
  if (!draft.area) errors.push("请选择检查区域");
  if (!draft.item.trim()) errors.push("请填写检查项目");
  if (!draft.engineer.trim()) errors.push("请填写签署人");
  if (draft.result === "defect") {
    if (!draft.defectDesc.trim()) errors.push("缺陷项请填写缺陷描述");
    if (!draft.actionPlan.trim()) errors.push("缺陷项必须填写处理意见才能提交复核");
  }
  return errors;
}
