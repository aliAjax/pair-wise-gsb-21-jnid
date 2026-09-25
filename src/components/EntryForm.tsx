import { useEffect, useMemo, useState } from "react";
import type { CheckResult, InspectionRecord, RecordDraft } from "../types";

interface Props {
  engineerName: string;
  onEngineerNameChange: (name: string) => void;
  editing: InspectionRecord | null;
  onSubmit: (draft: RecordDraft) => void;
  onCancelEdit: () => void;
}

const EMPTY: RecordDraft = {
  aircraft: "",
  ata: "",
  zone: "",
  item: "",
  result: "normal",
  defect: "",
  disposition: "",
  engineer: "",
};

export default function EntryForm({
  engineerName,
  onEngineerNameChange,
  editing,
  onSubmit,
  onCancelEdit,
}: Props) {
  const [draft, setDraft] = useState<RecordDraft>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (editing) {
      setDraft({
        aircraft: editing.aircraft,
        ata: editing.ata,
        zone: editing.zone,
        item: editing.item,
        result: editing.result,
        defect: editing.defect,
        disposition: editing.disposition,
        engineer: editing.engineer,
      });
      setSubmitted(false);
    }
  }, [editing]);

  // 非编辑态时用上次签署的姓名预填，避免重复输入
  useEffect(() => {
    if (!editing) {
      setDraft((d) => (d.engineer ? d : { ...d, engineer: engineerName }));
    }
  }, [engineerName, editing]);

  const isDefect = draft.result === "defect";

  const errors = useMemo(() => {
    const e: Partial<Record<keyof RecordDraft, string>> = {};
    if (!draft.aircraft.trim()) e.aircraft = "请填写机型";
    if (!draft.ata.trim()) e.ata = "请填写ATA章节，如 ATA 32";
    else if (!/^ATA\s*\d{2}(-\d{2})?$/i.test(draft.ata.trim()))
      e.ata = "章节格式应为 ATA 加两位数字，如 ATA 27";
    if (!draft.zone.trim()) e.zone = "请填写检查区域";
    if (!draft.item.trim()) e.item = "请填写检查项目";
    if (!draft.engineer.trim()) e.engineer = "请签署工程师姓名";
    if (isDefect) {
      if (!draft.defect.trim()) e.defect = "缺陷项必须填写缺陷描述";
      if (!draft.disposition.trim()) e.disposition = "缺陷项必须写明处理意见后才能提交复核";
    }
    return e;
  }, [draft, isDefect]);

  const valid = Object.keys(errors).length === 0;

  function update<K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    const normalized: RecordDraft = {
      ...draft,
      aircraft: draft.aircraft.trim(),
      ata: draft.ata
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^ATA\s?(\d{2}(?:-\d{2})?)$/, "ATA $1"),
      zone: draft.zone.trim(),
      item: draft.item.trim(),
      defect: isDefect ? draft.defect.trim() : "",
      disposition: isDefect ? draft.disposition.trim() : "",
      engineer: draft.engineer.trim(),
    };
    onEngineerNameChange(normalized.engineer);
    onSubmit(normalized);
    setDraft({ ...EMPTY, engineer: normalized.engineer });
    setSubmitted(false);
  }

  function handleReset() {
    if (editing) onCancelEdit();
    setDraft({ ...EMPTY, engineer: engineerName });
    setSubmitted(false);
  }

  const showError = (key: keyof RecordDraft) =>
    submitted && errors[key] ? <em className="field-error">{errors[key]}</em> : null;

  return (
    <section className="panel" id="entry-form">
      <div className="section-heading">
        <div>
          <p>维修工程师录入</p>
          <h2>{editing ? "修改退回记录" : "新增检查项"}</h2>
        </div>
        {editing && (
          <span className="edit-banner">退回记录修改后将重新进入待复核</span>
        )}
      </div>

      {editing?.returnReason && (
        <div className="return-reason-box">
          <strong>退回意见：</strong>
          {editing.returnReason}
        </div>
      )}

      <form className="field-grid" onSubmit={handleSubmit} noValidate>
        <label>
          <span>机型 *</span>
          <input
            value={draft.aircraft}
            onChange={(e) => update("aircraft", e.target.value)}
            placeholder="如 A320 / B737 / ARJ21"
          />
          {showError("aircraft")}
        </label>

        <label>
          <span>ATA章节 *</span>
          <input
            value={draft.ata}
            onChange={(e) => update("ata", e.target.value)}
            placeholder="如 ATA 32"
          />
          {showError("ata")}
        </label>

        <label>
          <span>检查区域 *</span>
          <input
            value={draft.zone}
            onChange={(e) => update("zone", e.target.value)}
            placeholder="如 起落架 / 航电 / 机体"
          />
          {showError("zone")}
        </label>

        <label>
          <span>检查项目 *</span>
          <input
            value={draft.item}
            onChange={(e) => update("item", e.target.value)}
            placeholder="如 主轮磨耗检查"
          />
          {showError("item")}
        </label>

        <fieldset className={`result-switch${isDefect ? " is-defect" : ""}`}>
          <legend>检查结论 *</legend>
          <label className="radio-line">
            <input
              type="radio"
              name="result"
              checked={draft.result === "normal"}
              onChange={() => update("result", "normal" as CheckResult)}
            />
            正常
          </label>
          <label className="radio-line">
            <input
              type="radio"
              name="result"
              checked={draft.result === "defect"}
              onChange={() => update("result", "defect" as CheckResult)}
            />
            缺陷
          </label>
        </fieldset>

        <label>
          <span>签署人 *</span>
          <input
            value={draft.engineer}
            onChange={(e) => update("engineer", e.target.value)}
            placeholder="维修工程师姓名"
          />
          {showError("engineer")}
        </label>

        {isDefect && (
          <>
            <label className="full-span">
              <span>缺陷描述 *</span>
              <textarea
                rows={2}
                value={draft.defect}
                onChange={(e) => update("defect", e.target.value)}
                placeholder="写明缺陷现象、位置、测量数据等"
              />
              {showError("defect")}
            </label>
            <label className="full-span">
              <span>处理意见 *（缺陷项必填，写明后方可提交复核）</span>
              <textarea
                rows={2}
                value={draft.disposition}
                onChange={(e) => update("disposition", e.target.value)}
                placeholder="如：更换件号 xxx 的主轮，按工卡 XXX 复测并签署"
              />
              {showError("disposition")}
            </label>
          </>
        )}

        <div className="form-actions full-span">
          <button type="submit" className="primary-action">
            {editing ? "重新提交复核" : "保存为待复核"}
          </button>
          <button type="button" onClick={handleReset}>
            {editing ? "放弃修改" : "清空"}
          </button>
        </div>
      </form>
    </section>
  );
}
