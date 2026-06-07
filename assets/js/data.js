/* ====================================================================
   SHARED MOCK DATA  ·  realistic, business-owner-facing legal content
   ==================================================================== */
window.DATA = (function(){

  /* The contract currently "under review" — clause-by-clause */
  const CLAUSES = [
    { id:'2.1',  title:'保密条款',        sev:'pass', cat:'保密',
      text:'双方应对在合作过程中获悉的对方商业秘密、技术资料及客户信息承担保密义务，保密期限为本协议终止后三（3）年。',
      ai:'保密范围、期限明确，符合常规商业实践，无需修改。' },

    { id:'4.3',  title:'付款与违约金',    sev:'high', cat:'金钱',
      text:'若乙方逾期付款，每逾期一日按合同总额的 <mark>千分之五</mark> 支付违约金，违约金累计上不封顶。',
      ai:'违约金折算为年化约 182.5%，远高于司法实践通常支持的上限（一般以未付金额为基数、且不超过年化 24% 左右）。一旦争议，极可能被法院大幅调减，且“上不封顶”条款效力存疑。',
      fix:'建议改为：以逾期未付金额为基数，按每日万分之五计违约金，累计不超过逾期金额的 20%。',
      basis:['《民法典》第585条 · 违约金过高可请求调减','最高法买卖合同司法解释 · 以实际损失为基准'] },

    { id:'5.2',  title:'知识产权归属',    sev:'pass', cat:'知产',
      text:'基于本协议产生的所有工作成果及衍生知识产权，自交付且付清款项之日起归甲方所有。',
      ai:'权属与付款挂钩，逻辑清晰，对甲方有利，建议保留。' },

    { id:'7.4',  title:'责任限制范围',    sev:'high', cat:'责任',
      text:'乙方对本协议项下的全部责任上限为乙方<mark>已收取的款项总额</mark>；甲方不设责任上限。',
      ai:'责任上限单向限定，权责严重不对等：对方风险封顶，我方风险敞口无限。属于显失公平的高风险条款。',
      fix:'建议设置对等责任上限（如均以合同总额为限），并将故意、重大过失、保密及知产侵权排除在责任限额之外。',
      basis:['《民法典》第497条 · 不合理免除/减轻己方责任的格式条款无效','对价对等原则'] },

    { id:'9.1',  title:'争议解决',        sev:'mid', cat:'程序',
      text:'因本协议产生的争议，提交<mark>乙方所在地</mark>仲裁委员会仲裁。',
      ai:'管辖地约定在对方所在地，将增加我方的维权成本与举证不便。仲裁条款本身有效，但地点不利。',
      fix:'建议改为甲方所在地或双方共同认可的中立第三地（如北京/上海仲裁委）。',
      basis:['《仲裁法》· 约定管辖应明确且可执行'] },

    { id:'11.6', title:'终止与自动续约',  sev:'mid', cat:'期限',
      text:'本协议期满前如双方未书面提出异议，则<mark>自动续约一年</mark>，续约次数不限。',
      ai:'自动续约缺少提前通知期与单方退出机制，存在被动续约、难以及时退出的风险。',
      fix:'建议补充：任一方可于到期前 30 日书面通知不再续约；明确续约的价格调整机制。',
      basis:['合同自由原则 · 应保留退出权'] },

    { id:'12.2', title:'不可抗力',        sev:'pass', cat:'免责',
      text:'因地震、台风、战争、政府行为等不可抗力导致无法履约的，受影响方不承担违约责任，但应及时通知并提供证明。',
      ai:'定义与通知义务完整，符合通行标准，无需修改。' },

    { id:'13.1', title:'通知与送达',      sev:'low', cat:'程序',
      text:'一切通知以书面形式发送至本协议载明的地址或电子邮箱即视为送达。',
      ai:'建议补充地址变更的通知义务，并明确电子送达的到达确认方式，降低“未收到”抗辩风险。',
      fix:'增加：一方地址/邮箱变更应提前 5 日书面告知，否则原地址送达有效。',
      basis:['送达确定性原则'] },
  ];

  const SUMMARY = {
    file:'技术服务合作协议（终稿）.pdf',
    pages: 14, words: '8,420', total: CLAUSES.length,
    high: CLAUSES.filter(c=>c.sev==='high').length,
    mid:  CLAUSES.filter(c=>c.sev==='mid').length,
    low:  CLAUSES.filter(c=>c.sev==='low').length,
    pass: CLAUSES.filter(c=>c.sev==='pass').length,
    score: 72,            // overall safety score /100
    party:'甲方（您）',
    counterparty:'某科技服务有限公司',
    type:'技术服务',
    industry:'科技 · 软件服务',
    tags:['技术服务','SaaS 订阅','跨境交付'],
    dimensions:['合同效力','付款风险','责任分配','数据合规','争议解决'],
    value:'¥ 1,200,000',
  };

  /* 缺失材料 — agent-flagged missing attachments */
  const MISSING = [
    { t:'服务级别协议（SLA）', d:'正文多次援引「附件二 SLA」，但未见该附件，无法核验可用性与赔偿标准。' },
    { t:'数据处理协议（DPA）', d:'涉及用户个人信息处理，建议补充 DPA 以满足《个人信息保护法》合规要求。' },
    { t:'验收标准说明', d:'§5 提及「通过验收」但未约定验收标准与流程，易引发付款争议。' },
  ];

  /* 知识库引用卡片 — cited by the agent in chat */
  const KB = [
    { id:'KB-585', src:'《民法典》第585条', tag:'违约金',
      snippet:'约定的违约金过分高于造成的损失的，当事人可请求法院或仲裁机构予以适当减少。' },
    { id:'KB-497', src:'《民法典》第497条', tag:'格式条款',
      snippet:'提供格式条款一方不合理地免除或减轻其责任的，该条款无效。' },
    { id:'KB-PIPL', src:'《个人信息保护法》第21条', tag:'数据合规',
      snippet:'委托处理个人信息的，应当与受托方约定处理目的、方式及保护措施。' },
  ];

  /* 工作台快捷问题 */
  const QUICK = [
    { q:'列出高风险条款', key:'high' },
    { q:'生成修改建议',   key:'fix' },
    { q:'缺失哪些材料',   key:'missing' },
    { q:'导出审核报告',   key:'report' },
  ];

  /* Dashboard history */
  const HISTORY = [
    { file:'技术服务合作协议（终稿）.pdf', type:'技术服务', date:'2026-06-07', score:72, high:2, mid:2, status:'live' },
    { file:'办公场地租赁合同.docx',        type:'租赁',     date:'2026-06-05', score:88, high:0, mid:1, status:'done' },
    { file:'股权代持协议.pdf',             type:'投融资',   date:'2026-06-03', score:54, high:3, mid:2, status:'done' },
    { file:'员工劳动合同_模板v3.docx',      type:'人事',     date:'2026-05-29', score:91, high:0, mid:1, status:'done' },
    { file:'SaaS 订阅服务条款（EN）.pdf',   type:'跨境',     date:'2026-05-24', score:67, high:1, mid:3, status:'done' },
    { file:'供应商采购框架协议.pdf',        type:'采购',     date:'2026-05-18', score:79, high:1, mid:2, status:'done' },
    { file:'保密协议 NDA（双向）.docx',     type:'保密',     date:'2026-05-11', score:95, high:0, mid:0, status:'done' },
  ];

  const STATS = [
    { num:'120,000+', lbl:'已审合同' },
    { num:'38 秒',    lbl:'平均审阅耗时' },
    { num:'99.2%',    lbl:'高风险条款召回率' },
    { num:'¥2.4 亿',  lbl:'帮客户规避的潜在损失' },
  ];

  const CASES = [
    { tag:'SaaS 创业公司', quote:'AGENT 在投资协议里揪出一条对赌回购的隐藏触发条件，帮我们省下了一轮可能的天价回购。', who:'李航 · 创始人' },
    { tag:'跨境电商',     quote:'以前一份英文条款要等律师两天，现在三十秒拿到中文风险清单，谈判节奏完全不一样了。', who:'Vivian · 运营负责人' },
    { tag:'连锁餐饮',     quote:'租赁合同里的自动续约和违约金，被它一眼标红。对非法律背景的我太友好了。', who:'王磊 · 区域经理' },
  ];

  const PLANS = [
    { name:'体验', price:'¥0', unit:'/ 永久', desc:'适合偶尔审一份合同',
      feats:['每月 3 份合同','核心风险标注','基础修改建议'], cta:'免费开始', hot:false },
    { name:'专业', price:'¥199', unit:'/ 月', desc:'高频签约的创业团队首选',
      feats:['不限合同份数','判例 + 法规对标','逐条修改建议与改写','中英双语 · 跨境协议','导出审核报告 PDF'], cta:'升级专业版', hot:true },
    { name:'企业', price:'定制', unit:'', desc:'团队协作与合规留痕',
      feats:['多成员 · 权限管理','合同库与版本对比','私有部署 · 数据隔离','专属法务顾问支持'], cta:'联系我们', hot:false },
  ];

  const sevLabel = { high:'高风险', mid:'需关注', low:'建议优化', pass:'通过' };
  const sevDot   = { high:'dot-high', mid:'dot-mid', low:'dot-low', pass:'' };

  return { CLAUSES, SUMMARY, MISSING, KB, QUICK, HISTORY, STATS, CASES, PLANS, sevLabel, sevDot };
})();
