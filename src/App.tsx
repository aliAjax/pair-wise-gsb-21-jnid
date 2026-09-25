import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type {
  CheckResult,
  InspectionRecord,
  RecordDraft,
  RecordStatus,
  ReviewAction,
  Role,
} from "./types";
import { RESULT_META, STATUS_META } from "./types";
import { AIRCRAFT_TYPES, AREAS, ATA_CHAPTERS, ataCode } from "./data";
import {
  clearRecords,
  loadName,
  loadRecords,
  loadRole,
  saveName,
  saveRecords,
  saveRole,
} from "./storage";
import { applyReview, createRecord, resubmitRecord } from "./workflow";
import { validateDraft } from "./validation";

const STATUS_FILTERS: Array<{ value: RecordStatus | "all"; label: string }> = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待复核" },
  { value: "returned", label: "已退回" },
  { value: "released", label: "已放行" },
];

const EMPTY_DRAFT: RecordDraft = {
  aircraftType: "",
  ataChapter: "",
  area: "",
  item: "",
  result: "normal",
  defectDesc: "",
  actionPlan: "",
  engineer: "",
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function StatusBadge({ status }: { status: RecordStatus }) {
  const meta = STATUS_META[status];
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}

function ResultBadge({ result }: { result: CheckResult }) {
  const meta = RESULT_META[result];
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={tone} />
    </article>
  );
}

interface FormProps {
  draft: RecordDraft;
  editing: InspectionRecord | null;
  errors: string[];
  onChange: (patch: Partial<RecordDraft>) => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
}

function RecordForm({ draft, editing, errors, onChange, onSubmit, onCancelEdit }: FormProps) {
  const isDefect = draft.result === "defect";
  return (
    <section className="panel" id="record-form">
      <div className="section-heading">
        <div>
          <p>维修工程师</p>
          <h2>{editing ? "修改退回记录" : "录入检查项"}</h2>
        </div>
        {editing && (
          <button type="button" onClick={onCancelEdit}>
            放弃修改
          </button>
        )}
      </div>

      {editing && (
        <div className="notice notice-return">
          该记录被退回，修改后需重新提交复核。
          {editing.reviews.length > 0 && (
            <span> 退回意见：{editing.reviews[editing.reviews.length - 1].comment}</span>
          )}
        </div>
      )}

      <form
        className="field-grid"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          <span>机型 *</span>
          <input
            list="aircraft-types"
            placeholder="如 A320 / B737"
            value={draft.aircraftType}
            onChange={(event) => onChange({ aircraftType: event.target.value })}
          />
          <datalist id="aircraft-types">
            {AIRCRAFT_TYPES.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </label>

        <label>
          <span>ATA章节 *</span>
          <select
            value={draft.ataChapter}
            onChange={(event) => onChange({ ataChapter: event.target.value })}
          >
            <option value="">请选择章节</option>
            {ATA_CHAPTERS.map((chapter) => (
              <option key={chapter} value={chapter}>
                {chapter}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>检查区域 *</span>
          <select
            value={draft.area}
            onChange={(event) => onChange({ area: event.target.value })}
          >
            <option value="">请选择区域</option>
            {AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>检查项目 *</span>
          <input
            placeholder="如 主起落架收放测试"
            value={draft.item}
            onChange={(event) => onChange({ item: event.target.value })}
          />
        </label>

        <fieldset className="result-picker">
          <span>检查结果 *</span>
          <div className="chips">
            {(["normal", "defect"] as CheckResult[]).map((result) => (
              <button
                key={result}
                type="button"
                className={draft.result === result ? "chip-active" : ""}
                onClick={() =>
                  onChange(
                    result === "normal"
                      ? { result, defectDesc: "", actionPlan: "" }
                      : { result }
                  )
                }
              >
                {RESULT_META[result].label}
              </button>
            ))}
          </div>
          <span className="form-hint">缺陷项必须填写处理意见才能提交复核</span>
        </fieldset>

        <label>
          <span>签署人（维修工程师）*</span>
          <input
            placeholder="填写姓名"
            value={draft.engineer}
            onChange={(event) => onChange({ engineer: event.target.value })}
          />
        </label>

        {isDefect && (
          <>
            <label className="span-2">
              <span>缺陷描述 *</span>
              <textarea
                rows={2}
                placeholder="描述发现的缺陷"
                value={draft.defectDesc}
                onChange={(event) => onChange({ defectDesc: event.target.value })}
              />
            </label>
            <label className="span-2">
              <span>处理意见 *（缺陷项必须填写处理意见才能提交复核）</span>
              <textarea
                rows={2}
                placeholder="填写缺陷的处理措施与安排"
                value={draft.actionPlan}
                onChange={(event) => onChange({ actionPlan: event.target.value })}
              />
            </label>
          </>
        )}

        {errors.length > 0 && (
          <div className="notice notice-error span-2">
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
        )}

        <div className="form-actions span-2">
          <button type="submit" className="primary-action">
            {editing ? "重新提交复核" : "提交复核"}
          </button>
          <span className="form-hint">提交后状态为「待复核」，等待放行人员复核</span>
        </div>
      </form>
    </section>
  );
}

function Timeline({ record }: { record: InspectionRecord }) {
  return (
    <ol className="timeline">
      <li>
        <span className="timeline-dot" />
        <div>
          <strong>录入并提交复核</strong>
          <p>
            {record.engineer} · {formatTime(record.submittedAt)}
          </p>
        </div>
      </li>
      {record.reviews.map((review, index) => (
        <li key={`${review.at}-${index}`}>
          <span className={`timeline-dot ${review.action === "release" ? "dot-ok" : "dot-warn"}`} />
          <div>
            <strong>{review.action === "release" ? "复核放行" : "复核退回"}</strong>
            <p>
              {review.by} · {formatTime(review.at)}
            </p>
            {review.comment && <p className="timeline-comment">“{review.comment}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

interface DetailProps {
  record: InspectionRecord;
  role: Role;
  onClose: () => void;
  onEdit: (record: InspectionRecord) => void;
  onDelete: (record: InspectionRecord) => void;
  onOpenReview: (record: InspectionRecord, action: ReviewAction) => void;
}

function DetailModal({ record, role, onClose, onEdit, onDelete, onOpenReview }: DetailProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const locked = record.status === "released";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>
              {record.aircraftType} · {record.ataChapter} · {record.item}
            </h3>
            <div className="badge-row">
              <StatusBadge status={record.status} />
              <ResultBadge result={record.result} />
              {locked && <span className="badge badge-locked">🔒 已锁定</span>}
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <dl className="detail-grid">
          <div>
            <dt>检查区域</dt>
            <dd>{record.area}</dd>
          </div>
          <div>
            <dt>签署人</dt>
            <dd>{record.engineer}</dd>
          </div>
          <div>
            <dt>提交时间</dt>
            <dd>{formatTime(record.submittedAt)}</dd>
          </div>
          <div>
            <dt>放行签署</dt>
            <dd>
              {record.releasedBy ? `${record.releasedBy} · ${formatTime(record.releasedAt)}` : "—"}
            </dd>
          </div>
        </dl>

        {record.result === "defect" && (
          <div className="defect-block">
            <div>
              <h4>缺陷描述</h4>
              <p>{record.defectDesc}</p>
            </div>
            <div>
              <h4>处理意见</h4>
              <p>{record.actionPlan}</p>
            </div>
          </div>
        )}

        <h4 className="timeline-title">流转记录</h4>
        <Timeline record={record} />

        <div className="modal-actions">
          {role === "inspector" && record.status === "pending" && (
            <>
              <button
                type="button"
                className="primary-action"
                onClick={() => onOpenReview(record, "release")}
              >
                放行
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => onOpenReview(record, "return")}
              >
                退回
              </button>
            </>
          )}
          {role === "engineer" && record.status === "returned" && (
            <button type="button" className="primary-action" onClick={() => onEdit(record)}>
              修改并重新提交
            </button>
          )}
          {role === "engineer" && !locked && (
            <button type="button" className="danger-action" onClick={() => onDelete(record)}>
              删除记录
            </button>
          )}
          {locked && <span className="form-hint">已放行的记录锁定，不能再修改</span>}
        </div>
      </div>
    </div>
  );
}

interface ReviewProps {
  record: InspectionRecord;
  action: ReviewAction;
  name: string;
  comment: string;
  error: string;
  onNameChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function ReviewModal({
  record,
  action,
  name,
  comment,
  error,
  onNameChange,
  onCommentChange,
  onConfirm,
  onClose,
}: ReviewProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isRelease = action === "release";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3>{isRelease ? "复核放行" : "复核退回"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="review-summary">
          <p>
            <strong>
              {record.aircraftType} · {record.ataChapter} · {record.item}
            </strong>
          </p>
          <p>
            检查区域：{record.area} · 检查结果：{RESULT_META[record.result].label} · 签署人：
            {record.engineer}
          </p>
          {record.result === "defect" && (
            <>
              <p>缺陷描述：{record.defectDesc}</p>
              <p>处理意见：{record.actionPlan}</p>
            </>
          )}
        </div>

        <form
          className="review-form"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
        >
          <label>
            <span>复核人（放行人员）*</span>
            <input
              placeholder="填写姓名"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </label>
          <label>
            <span>{isRelease ? "放行意见（选填）" : "退回意见 *（说明退回原因）"}</span>
            <textarea
              rows={3}
              placeholder={isRelease ? "可填写放行说明" : "请说明退回原因，便于工程师修改"}
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
            />
          </label>
          {error && <div className="notice notice-error">{error}</div>}
          <div className="modal-actions">
            <button
              type="submit"
              className={isRelease ? "primary-action" : "danger-action"}
            >
              {isRelease ? "确认放行（记录将锁定）" : "确认退回"}
            </button>
            <button type="button" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AtaStats({
  stats,
  active,
  onSelect,
}: {
  stats: Array<{ code: string; count: number }>;
  active: string | null;
  onSelect: (code: string | null) => void;
}) {
  const max = stats.length > 0 ? Math.max(...stats.map((item) => item.count)) : 0;
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>缺陷统计</p>
          <h2>按 ATA 章节统计缺陷项</h2>
        </div>
        {active && (
          <button type="button" onClick={() => onSelect(null)}>
            清除章节筛选
          </button>
        )}
      </div>
      {stats.length === 0 ? (
        <p className="empty-hint">当前没有缺陷项记录</p>
      ) : (
        <div className="ata-bars">
          {stats.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`ata-row ${active === item.code ? "ata-active" : ""}`}
              onClick={() => onSelect(active === item.code ? null : item.code)}
              title="点击筛选该章节记录"
            >
              <span className="ata-code">ATA {item.code}</span>
              <span className="ata-track">
                <span
                  className="ata-fill"
                  style={{ width: `${Math.max((item.count / max) * 100, 6)}%` }}
                />
              </span>
              <span className="ata-count">{item.count} 项</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [records, setRecords] = useState<InspectionRecord[]>(loadRecords);
  const [role, setRole] = useState<Role>(loadRole);
  const [draft, setDraft] = useState<RecordDraft>(() => ({
    ...EMPTY_DRAFT,
    engineer: loadName("engineer"),
  }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<RecordStatus | "all">("all");
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [ataFilter, setAtaFilter] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    record: InspectionRecord;
    action: ReviewAction;
  } | null>(null);
  const [reviewName, setReviewName] = useState(() => loadName("inspector"));
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    saveRole(role);
  }, [role]);

  const editingRecord = useMemo(
    () => records.find((record) => record.id === editingId) ?? null,
    [records, editingId]
  );

  const detailRecord = useMemo(
    () => records.find((record) => record.id === detailId) ?? null,
    [records, detailId]
  );

  const metrics = useMemo(() => {
    const released = records.filter((record) => record.status === "released").length;
    const defects = records.filter((record) => record.result === "defect").length;
    const pending = records.filter((record) => record.status === "pending").length;
    const ataCount = new Set(records.map((record) => ataCode(record.ataChapter))).size;
    return {
      completion: records.length === 0 ? 0 : Math.round((released / records.length) * 100),
      defects,
      pending,
      ataCount,
    };
  }, [records]);

  const ataStats = useMemo(() => {
    const counter = new Map<string, number>();
    records.forEach((record) => {
      if (record.result !== "defect") return;
      const code = ataCode(record.ataChapter);
      counter.set(code, (counter.get(code) ?? 0) + 1);
    });
    return [...counter.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code, "zh-CN"));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => statusFilter === "all" || record.status === statusFilter)
      .filter((record) => !areaFilter || record.area === areaFilter)
      .filter((record) => !ataFilter || ataCode(record.ataChapter) === ataFilter)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [records, statusFilter, areaFilter, ataFilter]);

  function handleSubmit() {
    const errors = validateDraft(draft);
    setFormErrors(errors);
    if (errors.length > 0) return;

    const now = new Date().toISOString();
    const clean: RecordDraft = {
      ...draft,
      aircraftType: draft.aircraftType.trim(),
      item: draft.item.trim(),
      engineer: draft.engineer.trim(),
      defectDesc: draft.defectDesc.trim(),
      actionPlan: draft.actionPlan.trim(),
    };

    if (editingRecord) {
      // 退回记录修改后重新提交，回到待复核
      const resubmitted = resubmitRecord(editingRecord, clean, now);
      if (!resubmitted) return;
      setRecords((prev) =>
        prev.map((record) => (record.id === resubmitted.id ? resubmitted : record))
      );
    } else {
      // 新录入的检查项直接保存为待复核
      setRecords((prev) => [createRecord(clean, uid(), now), ...prev]);
    }

    saveName("engineer", clean.engineer);
    setDraft({ ...EMPTY_DRAFT, engineer: clean.engineer });
    setEditingId(null);
    setFormErrors([]);
  }

  function handleEdit(record: InspectionRecord) {
    if (record.status !== "returned") return;
    setEditingId(record.id);
    setDraft({
      aircraftType: record.aircraftType,
      ataChapter: record.ataChapter,
      area: record.area,
      item: record.item,
      result: record.result,
      defectDesc: record.defectDesc,
      actionPlan: record.actionPlan,
      engineer: record.engineer,
    });
    setFormErrors([]);
    setDetailId(null);
    document.getElementById("record-form")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleDelete(record: InspectionRecord) {
    if (record.status === "released") return;
    if (!window.confirm(`确定删除「${record.item}」这条检查记录吗？`)) return;
    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    if (editingId === record.id) {
      setEditingId(null);
      setDraft({ ...EMPTY_DRAFT, engineer: loadName("engineer") });
    }
    setDetailId(null);
  }

  function openReview(record: InspectionRecord, action: ReviewAction) {
    setReviewTarget({ record, action });
    setReviewComment("");
    setReviewError("");
  }

  function handleReviewConfirm() {
    if (!reviewTarget) return;
    const name = reviewName.trim();
    const comment = reviewComment.trim();
    if (!name) {
      setReviewError("请填写复核人姓名");
      return;
    }
    if (reviewTarget.action === "return" && !comment) {
      setReviewError("退回时必须填写退回意见");
      return;
    }

    const now = new Date().toISOString();
    const { record, action } = reviewTarget;
    const current = records.find((item) => item.id === record.id);
    const reviewed = current ? applyReview(current, action, name, comment, now) : null;
    if (!reviewed) {
      setReviewError("该记录状态已变化，无法复核");
      return;
    }
    setRecords((prev) => prev.map((item) => (item.id === reviewed.id ? reviewed : item)));

    saveName("inspector", name);
    setReviewTarget(null);
    setReviewComment("");
    setReviewError("");
    setDetailId(null);
  }

  function handleResetStorage() {
    if (!window.confirm("将清空浏览器本地保存的全部检查记录，确定继续吗？")) return;
    clearRecords();
    setRecords([]);
    setEditingId(null);
    setDetailId(null);
    setReviewTarget(null);
    setDraft({ ...EMPTY_DRAFT, engineer: loadName("engineer") });
    setFormErrors([]);
  }

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      total: records.length,
      ataDefectStats: ataStats,
      records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `维修放行检查记录-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const pendingCount = metrics.pending;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-07 · 维修放行前检查</p>
          <h1>航空维修检查清单</h1>
          <p className="subtitle">
            维修工程师录入检查项并提交复核，放行人员复核后放行或退回；放行记录锁定存档，
            数据保存在浏览器本地，并按 ATA 章节统计缺陷项。
          </p>
        </div>
        <div className="stack-card">
          <span>当前角色</span>
          <div className="role-switch">
            <button
              type="button"
              className={role === "engineer" ? "chip-active" : ""}
              onClick={() => setRole("engineer")}
            >
              维修工程师
            </button>
            <button
              type="button"
              className={role === "inspector" ? "chip-active" : ""}
              onClick={() => setRole("inspector")}
            >
              放行人员
            </button>
          </div>
          <span className="form-hint">
            {role === "engineer"
              ? "录入检查项，提交复核；处理被退回的记录"
              : `复核待复核记录，决定放行或退回（当前 ${pendingCount} 条待复核）`}
          </span>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="完成率（已放行占比）" value={metrics.completion} tone="status-ok" />
        <MetricCard label="缺陷项" value={metrics.defects} tone="status-danger" />
        <MetricCard label="待复核" value={metrics.pending} tone="status-watch" />
        <MetricCard label="涉及 ATA 章节" value={metrics.ataCount} tone="status-ok" />
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>状态筛选</h2>
          <div className="chips">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={statusFilter === item.value ? "chip-active" : ""}
                onClick={() => setStatusFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <h2>检查区域</h2>
          <div className="chips muted">
            <button
              type="button"
              className={areaFilter === null ? "chip-active" : ""}
              onClick={() => setAreaFilter(null)}
            >
              全部
            </button>
            {AREAS.map((area) => (
              <button
                key={area}
                type="button"
                className={areaFilter === area ? "chip-active" : ""}
                onClick={() => setAreaFilter(areaFilter === area ? null : area)}
              >
                {area}
              </button>
            ))}
          </div>

          {ataFilter && (
            <>
              <h2>ATA 章节</h2>
              <div className="chips">
                <button type="button" className="chip-active" onClick={() => setAtaFilter(null)}>
                  ATA {ataFilter} ✕
                </button>
              </div>
            </>
          )}

          <h2>本地数据</h2>
          <p className="empty-hint">记录保存在浏览器 localStorage，重开页面不丢失。</p>
          <div className="chips">
            <button type="button" onClick={handleExport}>
              导出 JSON
            </button>
            <button type="button" className="danger-action" onClick={handleResetStorage}>
              清空本地数据
            </button>
          </div>
        </aside>

        {role === "engineer" ? (
          <RecordForm
            draft={draft}
            editing={editingRecord}
            errors={formErrors}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleSubmit}
            onCancelEdit={() => {
              setEditingId(null);
              setDraft({ ...EMPTY_DRAFT, engineer: loadName("engineer") });
              setFormErrors([]);
            }}
          />
        ) : (
          <section className="panel inspector-panel">
            <div className="section-heading">
              <div>
                <p>放行人员</p>
                <h2>待复核队列</h2>
              </div>
            </div>
            {pendingCount === 0 ? (
              <p className="empty-hint">当前没有待复核的记录。</p>
            ) : (
              <p className="empty-hint">
                有 {pendingCount} 条记录等待复核。在下方记录列表中打开「待复核」记录，选择放行或退回。
              </p>
            )}
            <button
              type="button"
              className="primary-action"
              onClick={() => setStatusFilter("pending")}
            >
              查看待复核记录
            </button>
          </section>
        )}
      </section>

      <AtaStats stats={ataStats} active={ataFilter} onSelect={setAtaFilter} />

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>检查记录</p>
            <h2>
              记录列表（{filteredRecords.length} / {records.length}）
            </h2>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <p className="empty-hint">
            {records.length === 0
              ? role === "engineer"
                ? "还没有检查记录，请在上方录入检查项。"
                : "还没有检查记录。"
              : "没有符合筛选条件的记录。"}
          </p>
        ) : (
          <div className="record-list">
            {filteredRecords.map((record) => (
              <article key={record.id} className="record-card">
                <div className={`record-index ${record.result === "defect" ? "index-defect" : ""}`}>
                  <small>ATA</small>
                  {ataCode(record.ataChapter)}
                </div>
                <div className="record-body">
                  <div className="record-head">
                    <h3>
                      {record.aircraftType} · {record.item}
                    </h3>
                    <div className="badge-row">
                      <StatusBadge status={record.status} />
                      <ResultBadge result={record.result} />
                      {record.status === "released" && (
                        <span className="badge badge-locked">🔒</span>
                      )}
                    </div>
                  </div>
                  <p>
                    {record.ataChapter} · {record.area} · 签署 {record.engineer} · 更新于{" "}
                    {formatTime(record.updatedAt)}
                  </p>
                  {record.result === "defect" && (
                    <p className="record-defect">
                      缺陷：{record.defectDesc} ｜ 处理意见：{record.actionPlan}
                    </p>
                  )}
                  <div className="record-actions">
                    <button type="button" onClick={() => setDetailId(record.id)}>
                      查看详情
                    </button>
                    {role === "inspector" && record.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="primary-action"
                          onClick={() => openReview(record, "release")}
                        >
                          放行
                        </button>
                        <button
                          type="button"
                          className="danger-action"
                          onClick={() => openReview(record, "return")}
                        >
                          退回
                        </button>
                      </>
                    )}
                    {role === "engineer" && record.status === "returned" && (
                      <button
                        type="button"
                        className="primary-action"
                        onClick={() => handleEdit(record)}
                      >
                        修改并重新提交
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {detailRecord && (
        <DetailModal
          record={detailRecord}
          role={role}
          onClose={() => setDetailId(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOpenReview={(record, action) => {
            setDetailId(null);
            openReview(record, action);
          }}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          record={reviewTarget.record}
          action={reviewTarget.action}
          name={reviewName}
          comment={reviewComment}
          error={reviewError}
          onNameChange={setReviewName}
          onCommentChange={setReviewComment}
          onConfirm={handleReviewConfirm}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </main>
  );
}
