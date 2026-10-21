import type { ConditionType, Instrument, Metric, Operator, Unit } from "./types";

// 标的字典：仅代码/名称，不包含任何真实行情数值
export const INSTRUMENTS: Instrument[] = [
  { code: "300750.SZ", name: "宁德时代" },
  { code: "600519.SH", name: "贵州茅台" },
  { code: "002594.SZ", name: "比亚迪" },
  { code: "600036.SH", name: "招商银行" },
  { code: "601012.SH", name: "隆基绿能" },
  { code: "601318.SH", name: "中国平安" },
  { code: "688981.SH", name: "中芯国际" },
];

export const SECTORS: Instrument[] = ["新能源", "白酒", "半导体", "银行", "光伏", "保险"].map((s) => ({
  code: `SECTOR:${s}`,
  name: `${s}板块`,
}));

export const ALL_INSTRUMENTS = [...INSTRUMENTS, ...SECTORS];

export const METRICS: Record<Metric, { label: string; type: ConditionType; unit: Unit; ops: Operator[] }> = {
  price_change_pct: { label: "区间涨跌幅", type: "price", unit: "%", ops: [">", ">=", "<", "<="] },
  price: { label: "价格", type: "price", unit: "CNY", ops: [">", ">=", "<", "<="] },
  volume_ratio: { label: "量比", type: "price", unit: "x", ops: [">", ">=", "<", "<="] },
  event_tag: { label: "公告/事件标签", type: "event", unit: "tag", ops: ["contains"] },
  days_to_event: { label: "距财报披露天数", type: "calendar", unit: "days", ops: ["<=", "<", "==", ">="] },
  heat_score: { label: "热度指数(0-100)", type: "popularity", unit: "score", ops: [">", ">=", "<", "<="] },
};

export const TYPE_LABEL: Record<ConditionType, string> = {
  price: "价格",
  event: "事件",
  calendar: "日历",
  popularity: "热度",
};

export const OP_LABEL: Record<Operator, string> = {
  ">": "大于",
  ">=": "大于等于",
  "<": "小于",
  "<=": "小于等于",
  "==": "等于",
  contains: "包含",
};

export const EVENT_TAGS = ["减持", "回购", "业绩预告", "监管问询", "股权质押", "分红"];
export const TIMEZONES = ["Asia/Shanghai", "Asia/Hong_Kong", "America/New_York"];
