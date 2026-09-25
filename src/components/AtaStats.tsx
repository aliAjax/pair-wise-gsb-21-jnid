import { useMemo } from "react";
import type { InspectionRecord, RecordStatus } from "../types";
import { STATUS_LABELS } from "../types";

interface Props {
  records: InspectionRecord[];
}

interface AtaStat {
  ata: string;
  total: number;
  defects: number;
  byStatus: Record<RecordStatus, number>;
}

export default function AtaStats({ records }: Props) {
  const stats = useMemo<AtaStat[]>(() => {
    const map = new Map<string, AtaStat>();
    for (const r of records) {
      const key = r.ata.toUpperCase();
      let s = map.get(key);
      if (!s) {
        s = { ata: key, total: 0, defects: 0, byStatus: { pending: 0, returned: 0, released: 0 } };
        map.set(key, s);
      }
      s.total += 1;
      s.byStatus[r.status] += 1;
      if (r.result === "defect") s.defects += 1;
    }
    return [...map.values()].sort((a, b) => b.defects - a.defects || a.ata.localeCompare(b.ata));
  }, [records]);

  const totalDefects = stats.reduce((sum, s) => sum + s.defects, 0);
  const maxDefects = Math.max(1, ...stats.map((s) => s.defects));

  return (
    <section className="panel ata-panel">
      <div className="section-heading">
        <div>
          <p>ATA章节统计</p>
          <h2>各章节缺陷项数量</h2>
        </div>
        <span className="total-defects">缺陷项合计 <b>{totalDefects}</b></span>
      </div>

      {stats.length === 0 ? (
        <p className="empty-hint">暂无记录，录入检查项后按ATA章节自动统计。</p>
      ) : (
        <table className="ata-table">
          <thead>
            <tr>
              <th>ATA章节</th>
              <th className="num">检查项</th>
              <th className="num">缺陷项</th>
              <th>缺陷占比</th>
              <th className="num">{STATUS_LABELS.pending}</th>
              <th className="num">{STATUS_LABELS.returned}</th>
              <th className="num">{STATUS_LABELS.released}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.ata} className={s.defects > 0 ? "has-defect" : ""}>
                <td className="ata-code">{s.ata}</td>
                <td className="num">{s.total}</td>
                <td className="num strong">{s.defects}</td>
                <td>
                  <div className="bar-cell">
                    <div
                      className="bar-fill"
                      style={{ width: `${(s.defects / maxDefects) * 100}%` }}
                    />
                    <span>{s.total ? Math.round((s.defects / s.total) * 100) : 0}%</span>
                  </div>
                </td>
                <td className="num">{s.byStatus.pending}</td>
                <td className="num">{s.byStatus.returned}</td>
                <td className="num">{s.byStatus.released}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
