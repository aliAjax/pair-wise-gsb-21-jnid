import { useMemo, useState } from "react";
import type { InspectionRecord, RecordStatus } from "../types";
import { STATUS_LABELS } from "../types";

interface Props {
  records: InspectionRecord[];
  releaserName: string;
  onReleaserNameChange: (name: string) => void;
  onRelease: (id: string, releaser: string) => void;
  onReturn: (id: string, releaser: string, reason: string) => void;
  onEdit: (record: InspectionRecord) => void;
  editingId: string | null;
}

type Filter = RecordStatus | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待复核" },
  { key: "returned", label: "已退回" },
  { key: "released", label: "已放行" },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RecordList({
  records,
  releaserName,
  onReleaserNameChange,
  onRelease,
  onReturn,
  onEdit,
  editingId,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reviewerError, setReviewerError] = useState("");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: records.length, pending: 0, returned: 0, released: 0 };
    records.forEach((r) => {
      c[r.status] += 1;
    });
    return c;
  }, [records]);

  const visible = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return filter === "all" ? sorted : sorted.filter((r) => r.status === filter);
  }, [records, filter]);

  function startReturn(id: string) {
    setReviewerError("");
    setReason("");
    setReasonFor(id);
  }

  function confirmReturn() {
    if (!releaserName.trim()) {
      setReviewerError("请先填写放行人员姓名");
      return;
    }
    if (!reason.trim()) {
      setReviewerError("退回时必须填写退回意见");
      return;
    }
    if (reasonFor) onReturn(reasonFor, releaserName.trim(), reason.trim());
    setReasonFor(null);
    setReason("");
    setReviewerError("");
  }

  function handleRelease(id: string) {
    if (!releaserName.trim()) {
      setReviewerError("请先填写放行人员姓名再执行放行");
      return;
    }
    onRelease(id, releaserName.trim());
  }

  return (
    <section className="panel records">
      <div className="section-heading">
        <div>
          <p>检查记录</p>
          <h2>复核与放行</h2>
        </div>
        <label className="reviewer-name">
          <span>放行人员签署</span>
          <input
            value={releaserName}
            onChange={(e) => {
              onReleaserNameChange(e.target.value);
              setReviewerError("");
            }}
            placeholder="放行人员姓名"
          />
        </label>
      </div>

      {reviewerError && <div className="inline-error">{reviewerError}</div>}

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "active" : ""}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <b>{counts[f.key]}</b>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty-hint">当前筛选下暂无记录，维修工程师可在上方录入检查项。</p>
      ) : (
        <div className="record-list">
          {visible.map((r) => {
            const locked = r.status === "released";
            const returning = reasonFor === r.id;
            return (
              <article key={r.id} className={`record-card status-${r.status}${editingId === r.id ? " being-edited" : ""}`}>
                <div className="record-main">
                  <div className="record-head">
                    <h3>
                      {r.aircraft} · {r.ata} · {r.zone}
                    </h3>
                    <span className={`status-badge badge-${r.status}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <p className="record-item">检查项目：{r.item}</p>

                  {r.result === "defect" ? (
                    <div className="defect-box">
                      <p><strong>缺陷描述：</strong>{r.defect}</p>
                      <p><strong>处理意见：</strong>{r.disposition}</p>
                    </div>
                  ) : (
                    <p className="normal-note">检查结论：正常，无缺陷</p>
                  )}

                  {r.status === "returned" && r.returnReason && (
                    <div className="return-reason-box">
                      <strong>退回意见：</strong>{r.returnReason}
                    </div>
                  )}

                  <dl className="record-meta">
                    <div><dt>录入工程师</dt><dd>{r.engineer}</dd></div>
                    <div><dt>提交时间</dt><dd>{formatTime(r.createdAt)}</dd></div>
                    {r.releaser && <div><dt>放行人员</dt><dd>{r.releaser}</dd></div>}
                    {r.releasedAt && <div><dt>放行时间</dt><dd>{formatTime(r.releasedAt)}</dd></div>}
                  </dl>

                  <details className="history">
                    <summary>流转记录（{r.history.length}）</summary>
                    <ol>
                      {r.history.map((h, i) => (
                        <li key={i}>
                          <span className="history-time">{formatTime(h.at)}</span>
                          <strong>{h.actor}</strong>
                          <em>{h.action}</em>
                          {h.note && <p>{h.note}</p>}
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>

                <div className="record-actions">
                  {r.status === "pending" && (
                    <>
                      <button className="primary-action" onClick={() => handleRelease(r.id)}>
                        放行
                      </button>
                      <button className="danger-action" onClick={() => startReturn(r.id)}>
                        退回
                      </button>
                    </>
                  )}
                  {r.status === "returned" && (
                    <button
                      className="primary-action"
                      onClick={() => onEdit(r)}
                      disabled={editingId === r.id}
                    >
                      {editingId === r.id ? "正在修改…" : "修改并重新提交"}
                    </button>
                  )}
                  {locked && <span className="locked-tag">已锁定，不可修改</span>}
                </div>

                {returning && (
                  <div className="return-panel">
                    <label>
                      <span>退回意见 *</span>
                      <textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="说明需要工程师补充或更正的内容"
                      />
                    </label>
                    <div className="form-actions">
                      <button className="danger-action" onClick={confirmReturn}>
                        确认退回
                      </button>
                      <button onClick={() => setReasonFor(null)}>取消</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
