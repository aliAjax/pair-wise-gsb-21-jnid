import type { InspectionRecord } from "./types";

/** 常用 ATA 章节（下拉选项，统计按章节号归组） */
export const ATA_CHAPTERS = [
  "ATA 05",
  "ATA 06",
  "ATA 07",
  "ATA 08",
  "ATA 09",
  "ATA 10",
  "ATA 11",
  "ATA 12",
  "ATA 20",
  "ATA 21",
  "ATA 22",
  "ATA 23",
  "ATA 24",
  "ATA 25",
  "ATA 26",
  "ATA 27",
  "ATA 28",
  "ATA 29",
  "ATA 30",
  "ATA 31",
  "ATA 32",
  "ATA 33",
  "ATA 34",
  "ATA 35",
  "ATA 36",
  "ATA 38",
  "ATA 49",
  "ATA 51",
  "ATA 52",
  "ATA 53",
  "ATA 54",
  "ATA 55",
  "ATA 56",
  "ATA 57",
  "ATA 70",
  "ATA 71",
  "ATA 72",
  "ATA 73",
  "ATA 74",
  "ATA 75",
  "ATA 76",
  "ATA 77",
  "ATA 78",
  "ATA 79",
  "ATA 80",
];

export const AREAS = [
  "机体",
  "动力装置",
  "航电",
  "起落架",
  "液压系统",
  "燃油系统",
  "客舱",
  "发动机",
];

export const AIRCRAFT_TYPES = ["A320", "A330", "A350", "B737", "B777", "B787", "ARJ21", "C919"];

/** 从 "ATA 32" 中提取章节号 "32"，用于统计归组 */
export function ataCode(ataChapter: string): string {
  const match = ataChapter.match(/\d+/);
  return match ? match[0] : ataChapter.trim();
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** 首次启动时的演示记录，覆盖三种状态，便于走通完整流程 */
export function buildSeedRecords(): InspectionRecord[] {
  return [
    {
      id: "seed-ata32",
      aircraftType: "A320",
      ataChapter: "ATA 32",
      area: "起落架",
      item: "主起落架收放测试",
      result: "defect",
      defectDesc: "主轮磨耗接近限制",
      actionPlan: "航后更换主轮并复测收放",
      engineer: "张工",
      status: "pending",
      createdAt: minutesAgo(180),
      updatedAt: minutesAgo(180),
      submittedAt: minutesAgo(180),
      releasedAt: null,
      releasedBy: null,
      reviews: [],
    },
    {
      id: "seed-ata24",
      aircraftType: "B737",
      ataChapter: "ATA 24",
      area: "航电",
      item: "电瓶电压检查",
      result: "normal",
      defectDesc: "",
      actionPlan: "",
      engineer: "王工",
      status: "released",
      createdAt: minutesAgo(60 * 26),
      updatedAt: minutesAgo(60 * 25),
      submittedAt: minutesAgo(60 * 26),
      releasedAt: minutesAgo(60 * 25),
      releasedBy: "李签",
      reviews: [
        {
          action: "release",
          by: "李签",
          at: minutesAgo(60 * 25),
          comment: "检查数据符合放行标准",
        },
      ],
    },
    {
      id: "seed-ata27",
      aircraftType: "ARJ21",
      ataChapter: "ATA 27",
      area: "机体",
      item: "副翼作动测试",
      result: "defect",
      defectDesc: "副翼作动测试需复查",
      actionPlan: "重新校准作动筒后复测",
      engineer: "张工",
      status: "returned",
      createdAt: minutesAgo(60 * 50),
      updatedAt: minutesAgo(60 * 30),
      submittedAt: minutesAgo(60 * 49),
      releasedAt: null,
      releasedBy: null,
      reviews: [
        {
          action: "return",
          by: "李签",
          at: minutesAgo(60 * 30),
          comment: "处理意见缺少复测结果，请补充后重新提交",
        },
      ],
    },
  ];
}
