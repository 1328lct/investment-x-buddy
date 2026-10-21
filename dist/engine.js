export const VERSION='1.0.0';
export const SAMPLE_TIME='2026-10-20T15:00:00+08:00';
export const registry=[
 {id:'market_snapshot',name:'行情结构',permission:'read',fields:['close','return_20d'],unit:'点 / %',schema:{symbols:'string[]',window:'20 trading days'},timeout:1800,retries:2},
 {id:'valuation',name:'估值比较',permission:'read',fields:['pe_ttm','percentile_3y'],unit:'倍 / %',schema:{symbols:'string[]',window:'3 years'},timeout:1800,retries:2},
 {id:'breadth',name:'市场宽度',permission:'read',fields:['above_ma20','sample_size'],unit:'% / 只',schema:{symbols:'string[]',window:'20 trading days'},timeout:1800,retries:2},
 {id:'risk_events',name:'风险变量',permission:'read',fields:['liquidity_change','event'],unit:'% / 文本',schema:{symbols:'string[]',window:'20 trading days'},timeout:1800,retries:2},
 {id:'report_compile',name:'综合研究',permission:'local',fields:['evidence_ids'],unit:'文档',schema:{evidence_ids:'string[]'},timeout:1800,retries:0}
];
export const clone=x=>JSON.parse(JSON.stringify(x));
export function safeGoal(goal){return !/(保证.*(赚|收益)|稳赚|必涨|必跌|买入|卖出|仓位|推荐.*股票|预测.*涨跌)/.test(goal)}
export function symbols(goal){let a=['沪深300','中证1000','上证50','中证500','创业板','新能源','半导体','银行','消费','医药'].filter(x=>goal.includes(x));return a.length?a:['沪深300','中证1000']}
export function hash(s){return [...s].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,17)}
export function newThread(goal,scenario='normal',limits={calls:12,cost:.12,seconds:120},memories=[]){
 if(!goal.trim())throw Error('请先输入研究目标');if(!safeGoal(goal))throw Error('该目标包含交易建议或确定性预测。请改为比较估值、宽度与风险证据。');
 const id=globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random());
 return {id,goal,scenario,limits:clone(limits),symbols:symbols(goal),createdAt:new Date().toISOString(),status:'pending',cursor:0,tasks:registry.map(t=>({id:t.id,name:t.name,status:'pending',attempts:0})),evidence:[],traces:[],events:[],checkpoints:[],context:[],summary:null,memories:clone(memories),cost:0,tokens:0,elapsed:0,approval:null,report:null,warning:scenario==='model'?'DEMO 规划器故障，已切换规则规划器；无真实模型调用':null};
}
export function event(t,message){t.events.push({at:new Date().toISOString(),message});}
export function checkpoint(t){const s=clone(t);delete s.checkpoints;t.checkpoints.push({id:'CP-'+(t.checkpoints.length+1),at:new Date().toISOString(),cursor:t.cursor,snapshot:s});if(t.checkpoints.length>20)t.checkpoints.shift();}
export function restore(t,cp){if(!cp)throw Error('检查点不存在');const cps=clone(t.checkpoints);const restored=clone(cp.snapshot);Object.assign(t,restored,{checkpoints:cps,status:'paused',approval:null});event(t,'已恢复 '+cp.id+'；从任务 '+(t.cursor+1)+' 继续，已完成任务不重跑');}
export function compress(t){if(t.context.join('').length<=500)return false;t.summary={at:new Date().toISOString(),text:`研究目标：${t.goal}。已完成 ${t.cursor} 项；记忆：${t.memories.map(m=>m.text).join('；')||'无'}；证据 ${t.evidence.map(e=>e.id).join(', ')}。缺失证据不得推断。`,evidence_ids:t.evidence.map(e=>e.id)};t.context=[t.summary.text];event(t,'上下文超过 500 字符，已生成结构摘要并保留证据 ID');return true;}
export function budgetReason(t){if(t.traces.length>=t.limits.calls)return '达到工具调用次数上限';if(t.cost+.008>t.limits.cost)return '达到模拟成本预算';if(t.elapsed>=t.limits.seconds*1000)return '达到运行时长上限';return null}
export function start(t){if(['cancelled','completed'].includes(t.status))return false;t.status='running';if(!t.checkpoints.length)checkpoint(t);event(t,'开始 / 继续执行；DEMO 规则引擎');return true}
export function pause(t){if(t.status==='running'){t.status='paused';event(t,'用户暂停')}}
export function cancel(t){if(!['completed','cancelled'].includes(t.status)){t.status='cancelled';t.approval=null;event(t,'用户取消；后续工具调用已停止')}}
export function approve(t,yes){if(!t.approval||t.approval.status!=='pending')return false;t.approval.status=yes?'approved':'rejected';t.status='completed';event(t,yes?'本次本地报告导出已批准':'本次导出已拒绝');return yes}
export function requestExport(t){if(!t.report)throw Error('请先完成研究报告');t.status='awaiting_approval';t.approval={id:'AP-'+Date.now(),threadId:t.id,scope:'当前线程报告 Markdown，本地下载；无外发',status:'pending',at:new Date().toISOString()};event(t,'请求审批：当前线程本地报告导出');}
export function consumeExport(t){if(t.approval?.status!=='approved'||t.approval.threadId!==t.id)return false;t.approval.status='consumed';return true}
export function compile(t){const valid=t.evidence.filter(e=>e.quality==='valid');const bad=t.evidence.filter(e=>e.quality!=='valid');return {title:t.goal,time:new Date().toISOString(),confidence:bad.length?35:72,facts:valid.map(e=>({text:`${e.symbol}：${e.label} ${e.value} ${e.unit}（合成样本事实）`,ids:[e.id]})),inference:bad.length?'证据不完整，无法形成正常比较结论。':`${t.symbols.join('与')}的合成样本呈现不同估值与参与度；此归纳只用于展示研究流程，不代表真实市场。`,unknown:bad.length?bad.map(e=>`${e.id} ${e.symbol} ${e.label}：${e.quality==='stale'?'数据过期':'数据缺失'}，不能据此判断`):['未接入真实扶摇 / iFinD 数据；政策、资金与历史样本尚未验证。'],conditions:['真实数据接入且通过时点、口径与完整性校验后，重新运行研究','估值分位、市场宽度或流动性证据发生变化时，重新检查归纳'],evidence_ids:t.evidence.map(e=>e.id),memory:t.memories.map(m=>m.text)};}
export async function step(t,wait=ms=>new Promise(r=>setTimeout(r,ms))){
 if(t.status!=='running')return;let reason=budgetReason(t);if(reason){t.status='paused';event(t,reason);return}
 const task=t.tasks[t.cursor];if(!task){t.status='completed';return}task.status='running';task.attempts++;let started=Date.now();
 const trace={id:`CALL-${t.traces.length+1}`,tool:task.id,input:{symbols:t.symbols,goal:t.goal,mode:'DEMO',sample_time:SAMPLE_TIME},startedAt:new Date().toISOString(),attempt:task.attempts,status:'running',estimatedCost:.008};t.traces.push(trace);
 await wait(650);
 trace.duration=Date.now()-started;t.elapsed+=trace.duration;t.cost=+(t.cost+.008).toFixed(3);t.tokens+=380;
 if(t.status!=='running'){trace.status='aborted';task.status='pending';event(t,'在途调用已中断，结果丢弃');return}
 if(t.elapsed>t.limits.seconds*1000){trace.status='timeout';task.status='pending';t.status='paused';event(t,'达到运行时长上限，在途结果丢弃');return}
 const failed=task.id==='valuation'&&(t.scenario==='persistent'||(t.scenario==='transient'&&task.attempts===1));
 if(failed){trace.status='error';trace.error='DEMO_INJECTED_TIMEOUT：人工注入工具失败';trace.output=null;event(t,`${task.name} 第 ${task.attempts} 次失败`);if(task.attempts<=2){task.status='pending';event(t,'进入有限重试，最多 3 次尝试');return}task.status='degraded';event(t,'重试耗尽，保留缺失证据，继续降级研究');}
 else{trace.status='success';task.status='completed'}
 if(task.id==='report_compile'){t.report=compile(t);trace.output={report:'已生成',evidence_ids:t.report.evidence_ids};}
 else{
 const type=registry.find(x=>x.id===task.id);let rows=t.symbols.map((symbol,i)=>{let seed=hash(symbol+task.id);let missing=failed||(t.scenario==='missing'&&task.id==='breadth');let stale=t.scenario==='stale'&&task.id==='market_snapshot';let v=task.id==='market_snapshot'?(3000+seed%4000):task.id==='valuation'?+(10+(seed%280)/10).toFixed(1):task.id==='breadth'?35+seed%40:-(seed%80)/10;
 return {id:`E-${t.evidence.length+i+1}`,symbol,label:type.name,field:type.fields[0],value:missing?null:v,unit:task.id==='market_snapshot'?'点':task.id==='valuation'?'倍':'%',quality:missing?'missing':stale?'stale':'valid',source:'DEMO 合成数据生成器 v1（非扶摇 / iFinD）',sampleTime:stale?'2024-01-02T15:00:00+08:00':SAMPLE_TIME,timezone:'Asia/Shanghai',scope:task.id==='breadth'?'构造的100只样本，收盘价高于20日均线的比例':task.id==='valuation'?'合成 PE TTM；并非真实指数估值':task.id==='market_snapshot'?'构造的指数收盘点位，非可交易行情':'构造的20日流动性变化；不含真实新闻',seed,formula:task.id==='market_snapshot'?'3000 + seed % 4000':task.id==='valuation'?'10 + (seed % 280) / 10':task.id==='breadth'?'35 + seed % 40':'-(seed % 80) / 10',callId:trace.id};});t.evidence.push(...rows);trace.output=clone(rows);t.context.push(JSON.stringify(rows));}
 t.cursor++;compress(t);checkpoint(t);if(t.cursor===t.tasks.length){t.status='completed';event(t,'研究完成，报告可追溯至合成证据')}
}
export function markdown(t){const r=t.report;return `# ${r.title}\n\n> DEMO：全部为合成数据；规则规划器；无真实模型/金融接口调用。仅研究演示，不构成投资建议。\n\n生成时间：${r.time}\n样本时点：${SAMPLE_TIME}\n规则置信分：${r.confidence}/100（非统计概率）\n\n## 合成样本事实\n${r.facts.map(f=>'- '+f.text+' ['+f.ids.join(',')+']').join('\n')}\n\n## 归纳\n${r.inference}\n\n## 不确定判断与缺失\n${r.unknown.join('\n')}\n\n## 重评条件\n${r.conditions.join('\n')}\n\n## 证据原始记录\n\n\`\`\`json\n${JSON.stringify(t.evidence,null,2)}\n\`\`\`\n`;}
