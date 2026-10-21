# 比较沪深300与中证1000的估值和市场宽度

> DEMO：全部为合成数据；规则规划器；无真实模型/金融接口调用。仅研究演示，不构成投资建议。

生成时间：2026-10-21T02:31:54.747Z
样本时点：2026-10-20T15:00:00+08:00
规则置信分：72/100（非统计概率）

## 合成样本事实
- 沪深300：行情结构 6884 点（合成样本事实） [E-1]
- 中证1000：行情结构 3291 点（合成样本事实） [E-2]
- 沪深300：估值比较 21 倍（合成样本事实） [E-3]
- 中证1000：估值比较 12.1 倍（合成样本事实） [E-4]
- 沪深300：市场宽度 52 %（合成样本事实） [E-5]
- 中证1000：市场宽度 59 %（合成样本事实） [E-6]
- 沪深300：风险变量 -6.2 %（合成样本事实） [E-7]
- 中证1000：风险变量 -3.7 %（合成样本事实） [E-8]

## 归纳
沪深300与中证1000的合成样本呈现不同估值与参与度；此归纳只用于展示研究流程，不代表真实市场。

## 不确定判断与缺失
未接入真实扶摇 / iFinD 数据；政策、资金与历史样本尚未验证。

## 重评条件
真实数据接入且通过时点、口径与完整性校验后，重新运行研究
估值分位、市场宽度或流动性证据发生变化时，重新检查归纳

## 证据原始记录

```json
[
  {
    "id": "E-1",
    "symbol": "沪深300",
    "label": "行情结构",
    "field": "close",
    "value": 6884,
    "unit": "点",
    "quality": "valid",
    "source": "DEMO 合成数据生成器 v1（非扶摇 / iFinD）",
    "sampleTime": "2026-10-20T15:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "scope": "构造的指数收盘点位，非可交易行情",
    "seed": 1984539884,
    "formula": "3000 + seed % 4000",
    "callId": "CALL-1"
  },
  {
    "id": "E-2",
    "symbol": "中证1000",
    "label": "行情结构",
    "field": "close",
    "value": 3291,
    "unit": "点",
    "quality": "valid",
    "source": "DEMO 合成数据生成器 v1（非扶摇 / iFinD）",
    "sampleTime": "2026-10-20T15:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "scope": "构造的指数收盘点位，非可交易行情",
    "seed": 2954156291,
    "formula": "3000 + seed % 4000",
    "callId": "CALL-1"
  },
  {
    "id": "E-3",
    "symbol": "沪深300",
    "label": "估值比较",
    "field": "pe_ttm",
    "value": 21,
    "unit": "倍",
    "quality": "valid",
    "source": "DEMO 合成数据生成器 v1（非扶摇 / iFinD）",
    "sampleTime": "2026-10-20T15:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "scope": "合成 PE TTM；并非真实指数估值",
    "seed": 3963888710,
    "formula": "10 + (seed % 280) / 10",
    "callId": "CALL-2"
  },
  {
    "id": "E-4",
    "symbol": "中证1000",
    "label": "估值比较",
    "field": "pe_ttm",
    "value": 12.1,
    "unit": "倍",
    "quality": "valid",
    "source": "DEMO 合成数据生成器 v1（非扶摇 / iFinD）",
    "sampleTime": "2026-10-20T15:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "scope": "合成 PE TTM；并非真实指数估值",
    "seed": 4169919901,
    "formula": "10 + (seed % 280) / 10",
    "callId": "CALL-2"
  },
  {
    "id": "E-5",
    "symbol": "沪深300",
    "label": "市场宽度",
    "field": "above_ma20",
    "value": 52,
    "unit": "%",
    "quality": "valid",
    "source": "DEMO 合成数据生成器 v1（非扶摇 / iFinD）",
    "sampleTime": "2026-10-20T15:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "scope": "构造的100只样本，收盘价高于20日均线的比例",
    "seed": 1777243377,
    "formula": "35 + seed % 40",
    "callId": "CALL-3"
  },
  {
    "id": "E-6",
    "symbol": "中证1000",
    "label": "市场宽度",
    "field": "above_ma20",
    "value": 59,
    "unit": "%",
    "quality": "valid",
    "source": "DEMO 合成数据生成器 v1（非扶摇 / iFinD）",
    "sampleTime": "2026-10-20T15:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "scope": "构造的100只样本，收盘价高于20日均线的比例",
    "seed": 3078014984,
    "formula": "35 + seed % 40",
    "callId": "CALL-3"
  },
  {
    "id": "E-7",
    "symbol": "沪深300",
    "label": "风险变量",
    "field": "liquidity_change",
    "value": -6.2,
    "unit": "%",
    "quality": "valid",
    "source": "DEMO 合成数据生成器 v1（非扶摇 / iFinD）",
    "sampleTime": "2026-10-20T15:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "scope": "构造的20日流动性变化；不含真实新闻",
    "seed": 3068509582,
    "formula": "-(seed % 80) / 10",
    "callId": "CALL-4"
  },
  {
    "id": "E-8",
    "symbol": "中证1000",
    "label": "风险变量",
    "field": "liquidity_change",
    "value": -3.7,
    "unit": "%",
    "quality": "valid",
    "source": "DEMO 合成数据生成器 v1（非扶摇 / iFinD）",
    "sampleTime": "2026-10-20T15:00:00+08:00",
    "timezone": "Asia/Shanghai",
    "scope": "构造的20日流动性变化；不含真实新闻",
    "seed": 3495988517,
    "formula": "-(seed % 80) / 10",
    "callId": "CALL-4"
  }
]
```
