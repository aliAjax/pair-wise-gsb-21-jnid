import type { InspectionRecord, RecordEvent, RecordStatus } from "./types";

const RECORDS_KEY = "hxwl-07:inspection-records:v1";
const ENGINEER_KEY = "hxwl-07:engineer-name";
const RELEASER_KEY = "hxwl-07:releaser-name";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function now(): string {
  return new Date().toISOString();
}

function atHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function event(at: string, actor: string, action: string, note?: string): RecordEvent {
  return { at, actor, action, note };
}

// 首次打开时播种的演示记录，覆盖三种状态；之后一切以浏览器本地数据为准
function seedRecords(): InspectionRecord[] {
  const t0 = atHoursAgo(26);
  const t1 = atHoursAgo(22);
  const t2 = atHoursAgo(20);
  const t3 = atHoursAgo(6);
  const t4 = atHoursAgo(4);

  const a: InspectionRecord = {
    id: uid(),
    aircraft: "A320",
    ata: "ATA 32",
    zone: "起落架",
    item: "主轮磨耗检查",
    result: "defect",
    defect: "主轮胎面磨耗接近限制值，见深度测量记录",
    disposition: "更换主轮后重新测量，确认胎面深度满足工卡要求",
    engineer: "张工",
    createdAt: t0,
    updatedAt: t2,
    status: "returned",
    returnReason: "处理意见未注明更换后的复测要求，请补充具体工卡步骤后重新提交。",
    history: [
      event(t0, "张工", "提交复核"),
      event(t2, "李放行", "退回", "处理意见未注明更换后的复测要求，请补充具体工卡步骤后重新提交。"),
    ],
  };

  const b: InspectionRecord = {
    id: uid(),
    aircraft: "B737",
    ata: "ATA 24",
    zone: "航电",
    item: "电瓶电压检查",
    result: "normal",
    defect: "",
    disposition: "",
    engineer: "王工",
    createdAt: t1,
    updatedAt: t3,
    status: "released",
    releaser: "李放行",
    releasedAt: t3,
    history: [
      event(t1, "王工", "提交复核"),
      event(t3, "李放行", "放行"),
    ],
  };

  const c: InspectionRecord = {
    id: uid(),
    aircraft: "ARJ21",
    ata: "ATA 27",
    zone: "机体",
    item: "副翼作动测试",
    result: "defect",
    defect: "副翼作动测试行程偏差，需复查",
    disposition: "重新校准作动器并完成全行程测试，留存测试曲线",
    engineer: "赵工",
    createdAt: t4,
    updatedAt: t4,
    status: "pending",
    history: [event(t4, "赵工", "提交复核")],
  };

  return [a, b, c];
}

export function loadRecords(): InspectionRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw === null) {
      const seeded = seedRecords();
      localStorage.setItem(RECORDS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as InspectionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: InspectionRecord[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // 存储不可用时仅保留内存数据，不阻断流程
  }
}

export function loadName(key: "engineer" | "releaser"): string {
  return localStorage.getItem(key === "engineer" ? ENGINEER_KEY : RELEASER_KEY) ?? "";
}

export function saveName(key: "engineer" | "releaser", value: string): void {
  localStorage.setItem(key === "engineer" ? ENGINEER_KEY : RELEASER_KEY, value);
}

export function clearStoredRecords(): void {
  localStorage.removeItem(RECORDS_KEY);
}

export const statusOf = (r: InspectionRecord): RecordStatus => r.status;
