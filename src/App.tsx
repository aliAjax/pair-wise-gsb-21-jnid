import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import AtaStats from "./components/AtaStats";
import EntryForm from "./components/EntryForm";
import RecordList from "./components/RecordList";
import {
  loadName,
  loadRecords,
  now,
  saveName,
  saveRecords,
  uid,
} from "./storage";
import type { InspectionRecord, RecordDraft } from "./types";

const project = {
  id: "hxwl-07",
  port: 5107,
  title: "航空维修检查清单",
  subtitle: "维修放行前检查：工程师录入提交，放行人员复核签放，记录本地留存",
  stack: "React + Vite + TypeScript + 浏览器本地存储",
};

function App() {
  const [records, setRecords] = useState<InspectionRecord[]>(() => loadRecords());
  const [engineerName, setEngineerName] = useState(() => loadName("engineer"));
  const [releaserName, setReleaserName] = useState(() => loadName("releaser"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const editing = useMemo(
    () => records.find((r) => r.id === editingId) ?? null,
    [records, editingId],
  );

  const metrics = useMemo(() => {
    const total = records.length;
    const defects = records.filter((r) => r.result === "defect").length;
    const pending = records.filter((r) => r.status === "pending").length;
    const released = records.filter((r) => r.status === "released").length;
    const rate = total ? Math.round((released / total) * 100) : 0;
    return { total, defects, pending, rate };
  }, [records]);

  function notify(msg: string) {
    setToast(msg);
  }

  // 工程师：保存为待复核（新建，或退回记录修改后重新提交）
  function handleSubmitDraft(draft: RecordDraft) {
    const t = now();
    if (editing) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editing.id
            ? {
                ...r,
                aircraft: draft.aircraft,
                ata: draft.ata,
                zone: draft.zone,
                item: draft.item,
                result: draft.result,
                defect: draft.defect,
                disposition: draft.disposition,
                engineer: draft.engineer,
                status: "pending",
                returnReason: undefined,
                updatedAt: t,
                history: [
                  ...r.history,
                  {
                    at: t,
                    actor: draft.engineer,
                    action: "修改后重新提交复核",
                  },
                ],
              }
            : r,
        ),
      );
      setEditingId(null);
      notify("退回记录已修改，重新进入待复核");
      return;
    }

    const record: InspectionRecord = {
      id: uid(),
      ...draft,
      createdAt: t,
      updatedAt: t,
      status: "pending",
      history: [{ at: t, actor: draft.engineer, action: "提交复核" }],
    };
    setRecords((prev) => [record, ...prev]);
    notify("检查项已保存为待复核");
  }

  // 放行人员：复核放行，记录锁定
  function handleRelease(id: string, releaser: string) {
    const t = now();
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "released",
              releaser,
              releasedAt: t,
              updatedAt: t,
              history: [...r.history, { at: t, actor: releaser, action: "放行，记录锁定" }],
            }
          : r,
      ),
    );
    notify("已放行，记录锁定不可再改");
  }

  // 放行人员：退回工程师修改
  function handleReturn(id: string, releaser: string, reason: string) {
    const t = now();
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "returned",
              returnReason: reason,
              updatedAt: t,
              history: [...r.history, { at: t, actor: releaser, action: "退回", note: reason }],
            }
          : r,
      ),
    );
    notify("已退回，工程师修改后需重新提交复核");
  }

  function handleStartEdit(record: InspectionRecord) {
    setEditingId(record.id);
    document.getElementById("entry-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  function handleEngineerNameChange(name: string) {
    setEngineerName(name);
    saveName("engineer", name);
  }

  function handleReleaserNameChange(name: string) {
    setReleaserName(name);
    saveName("releaser", name);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
          <ol className="flow-line">
            <li>工程师录入</li>
            <li>待复核</li>
            <li>放行 / 退回</li>
            <li>放行锁定 · 退回重提</li>
          </ol>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>{project.stack}</strong>
          <span>角色：维修工程师 · 放行人员 · 培训教员（只读）</span>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>检查项总数</span>
          <strong>{metrics.total}</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>缺陷项</span>
          <strong>{metrics.defects}</strong>
          <i className="status-danger" />
        </article>
        <article className="metric-card">
          <span>待复核</span>
          <strong>{metrics.pending}</strong>
          <i className="status-watch" />
        </article>
        <article className="metric-card">
          <span>放行完成率</span>
          <strong>{metrics.rate}%</strong>
          <i className="status-ok" />
        </article>
      </section>

      <EntryForm
        engineerName={engineerName}
        onEngineerNameChange={handleEngineerNameChange}
        editing={editing}
        onSubmit={handleSubmitDraft}
        onCancelEdit={handleCancelEdit}
      />

      <RecordList
        records={records}
        releaserName={releaserName}
        onReleaserNameChange={handleReleaserNameChange}
        onRelease={handleRelease}
        onReturn={handleReturn}
        onEdit={handleStartEdit}
        editingId={editingId}
      />

      <AtaStats records={records} />

      <footer className="app-footer">
        记录保存在本浏览器（localStorage），重开页面仍可查看；放行后的记录已锁定。
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
