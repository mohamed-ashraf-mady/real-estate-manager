/* =====================================================
   مدير التسويق v3 - marketing.js
   خطة ذكية (Thompson Sampling) + سجل يومي + تقارير تقدّم + Funnel
   يعتمد على: db, showToast, drawBar, confirmDialog, charts (من app.js)
   جداول مطلوبة: marketing_groups, marketing_tasks, marketing_log (SQL في marketing_log.sql)
   ===================================================== */
(function () {
  'use strict';

  /* ---------- الإعدادات ---------- */
  const PLAN = [
    { day: 0,  type: 'teaser', label: 'تشويق',          icon: '👀', group: true  },
    { day: 1,  type: 'main',   label: 'الإعلان الرئيسي', icon: '🏡', group: true  },
    { day: 2,  type: 'match',  label: 'مطابقة العملاء',  icon: '💬', group: false },
    { day: 4,  type: 'reel',   label: 'ريلز / جولة',     icon: '🎬', group: true  },
    { day: 6,  type: 'value',  label: 'بوست قيمة',       icon: '💡', group: true  },
    { day: 9,  type: 'repost', label: 'إعادة نشر',       icon: '🔁', group: true  },
    { day: 14, type: 'review', label: 'مراجعة',          icon: '✅', group: false }
  ];
  const META = Object.fromEntries(PLAN.map(s => [s.type, s]));
  const POSTABLE = ['teaser', 'main', 'reel', 'value', 'repost'];
  const TEST_HOURS = [13, 18, 21, 23];
  const DEFAULT_PLACE = 'الصالحية الجديدة';
  const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const PRIOR_A = 1.5, PRIOR_B = 1; // توقع مبدئي: 1.5 استفسار/بوست

  /* ---------- أدوات ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dayDiff = (a, b) => Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);
  const fmtHour = h => h == null ? '—' : (h % 12 || 12) + ' ' + (h >= 12 ? 'م' : 'ص');
  const today = () => iso(new Date());
  const say = (m, t) => (typeof showToast === 'function' ? showToast(m, t || 'success') : console.log(m));
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const sum = a => a.reduce((x, y) => x + y, 0);
  const r1 = n => Math.round(n * 10) / 10;
  const num = v => Number(v) || 0;
  const fmtN = n => Number(n).toLocaleString('en-US');

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(label, cls, fn) { const b = el('button', 'mk-btn ' + (cls || '')); b.type = 'button'; b.textContent = label; b.onclick = fn; return b; }

  /* ---------- رياضيات: Thompson Sampling + اختبار دلالة ---------- */
  function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function gammaSample(k) {
    if (k < 1) return gammaSample(k + 1) * Math.pow(Math.random(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = randn(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  // عينة من توزيع Gamma-Poisson الخلفي لمتوسط الاستفسارات
  const tsSample = arr => gammaSample(PRIOR_A + sum(arr || [])) / (PRIOR_B + (arr || []).length);
  function pickThompson(cands, statsOf) {
    let best = null, bv = -1;
    cands.forEach(c => { const s = tsSample(statsOf(c)); if (s > bv) { bv = s; best = c; } });
    return best;
  }
  const erf = x => { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; };
  const normCdf = z => 0.5 * (1 + erf(z / Math.SQRT2));
  const variance = a => { if (a.length < 2) return 0; const m = avg(a); return sum(a.map(x => (x - m) * (x - m))) / (a.length - 1); };
  function sigTest(a, b) { // Welch z تقريبي، يرجّع p-value
    if (a.length < 3 || b.length < 3) return null;
    const z = (avg(a) - avg(b)) / Math.sqrt(variance(a) / a.length + variance(b) / b.length + 1e-9);
    return 2 * (1 - normCdf(Math.abs(z)));
  }
  const sigLabel = p => p == null ? 'بيانات غير كافية للمقارنة' : p < 0.05 ? 'فرق مؤكد إحصائيًا ✔' : p < 0.2 ? 'مؤشر قوي (محتاج بيانات أكتر للتأكيد)' : 'لسه ممكن يكون صدفة';

  /* ---------- قراءة بيانات العقار ---------- */
  function info(p) {
    const specs = [];
    if (p.area_m2) specs.push(p.area_m2 + ' م²');
    if (p.rooms) specs.push(p.rooms + ' غرف');
    if (p.bathrooms) specs.push(p.bathrooms + ' حمام');
    if (p.floor !== null && p.floor !== undefined && p.floor !== '') specs.push(Number(p.floor) === 0 ? 'الدور الأرضي' : 'الدور ' + p.floor);
    if (p.finishing) specs.push('تشطيب ' + p.finishing);
    return { type: p.type || 'عقار', hood: p.area || p.governorate || DEFAULT_PLACE, gov: p.governorate || '', address: p.address || '', specs };
  }

  /* ---------- قوالب البوستات (بدون سعر أبدًا) ---------- */
  function postText(task, p, variant) {
    const i = info(p), v = ((variant % 3) + 3) % 3;
    const line = i.specs.join(' • ');
    const bullets = i.specs.map(s => '✔ ' + s).join('\n');
    const where = i.address ? `📍 ${i.hood} - ${i.address}` : `📍 ${i.hood}`;
    const cta = ['كلمني خاص وأبعتلك التفاصيل 📩', 'اكتب لي على الخاص للتفاصيل والمعاينة', 'للاستفسار والمعاينة راسلني على الخاص'][v];

    switch (task.task_type) {
      case 'teaser':
        return [
          `🔔 قريبًا في ${i.hood}...\nفرصة ${i.type} مش هتتكرر. تابعني وخلّي الإشعارات شغالة.`,
          `فيه حاجة جاية في ${i.hood} 👀\n${i.type} بمواصفات مميزة. التفاصيل بكرة بإذن الله.`,
          `استنوا بكرة ✨\n${i.type} جديد في ${i.hood}.`
        ][v];
      case 'main':
        return [
          `🏡 ${i.type} للبيع في ${i.hood}\n${line}\n${where}\n\n${cta}`,
          `متاح الآن: ${i.type} في ${i.hood} 🔑\n${line}\nمناسب للي بيدور على الراحة والموقع.\n${where}\n\n${cta}`,
          `${i.type} في ${i.hood}\n${bullets}\n${where}\n\n${cta}`
        ][v];
      case 'reel':
        return `🎬 سيناريو ريلز 30 ثانية (موبايل + إضاءة نهار):\n1) المدخل/العمارة (3 ث)\n2) الصالة (5 ث)\n3) أوضة النوم (5 ث)\n4) المطبخ والحمام (5 ث)\n5) البلكونة/الإطلالة (7 ث)\n6) لقطة أخيرة + "كلمني خاص" (5 ث)\n\n📝 الكابشن:\n${i.type} في ${i.hood} 🏡 ${line}\nشوف الجولة كاملة وكلمني خاص للمعاينة.`;
      case 'value':
        return [
          `٣ حاجات لازم تفحصها قبل ما تشتري ${i.type}:\n1) الأوراق والتسجيل\n2) حالة التشطيب والمواسير\n3) الخدمات القريبة والمواصلات\n\nعندي ${i.type} في ${i.hood} بيحقق الشروط دي. كلمني خاص.`,
          `سؤال لأهل ${i.hood} 👇\nلو بتدور على ${i.type}، الأهم عندك: الموقع ولا المساحة ولا التشطيب؟\nاكتب رأيك في الكومنت، وعندي فرصة مناسبة.`,
          `ليه ${i.hood} اختيار كويس للسكن؟\nخدمات قريبة وهدوء ومجتمع بيعرف بعضه.\nلو مهتم بـ${i.type} هناك، ابعتلي رسالة.`
        ][v];
      case 'repost':
        return [
          `⏳ لسه متاح: ${i.type} في ${i.hood}\n${line}\nالمعاينات متاحة بمواعيد محدودة هذا الأسبوع.\n\n${cta}`,
          `اللي فاته الإعلان الأول 👇\n${i.type} في ${i.hood} - ${line}\nالطلب بيزيد، كلمني خاص قبل ما يتحجز.`,
          `فرصة متبقية: ${i.type} في ${i.hood} 🔑\n${line}\n\n${cta}`
        ][v];
      default: return '';
    }
  }

  function tips(type) {
    return ({
      teaser: '📷 صورة واحدة بس (الواجهة أو الإطلالة) من غير أي تفاصيل.',
      main: '⚠️ بدون سعر. لو حد كتب "سعر؟" رد: "ابعتلك التفاصيل على الخاص 👌". وكن متاحًا أول ساعة.',
      reel: '🎥 صوّر أفقي أو رأسي ثابت، وبدون موسيقى مخالفة.',
      value: '💬 رد على كل كومنت، والكومنت الطويل أحسن من كلمة واحدة.',
      repost: '📷 غيّر الصور وترتيبها وأول سطر عن المرة الأولى (تكرار نفس البوست يضر).',
      match: 'ابعت واتساب شخصي لكل عميل مطابق (من الزرار تحت). ده أسرع طريق للبيع.',
      review: '✅ كام استفسار جالك؟ لو قليل: غيّر الصور/العنوان/الأسلوب أو جرّب إعلان مدفوع صغير على أحسن بوست. اتباع؟ غيّر حالة العقار.'
    })[type] || '';
  }

  /* ---------- البيانات ---------- */
  let S = { tab: 'today', range: 30, rpt: 'week', data: null, loaded: false, logOk: true };

  async function loadData() {
    const [g, t, p, l, d] = await Promise.all([
      db.from('marketing_groups').select('*').order('created_at'),
      db.from('marketing_tasks').select('*').order('due_date'),
      db.from('properties').select('*'),
      db.from('marketing_log').select('*').order('log_date', { ascending: false }),
      db.from('deals').select('id, property_id, agreed_price, deal_date, status')
    ]);
    const err = g.error || t.error || p.error;
    if (err) { console.error('marketing:', err); say('تعذر تحميل بيانات التسويق', 'error'); }
    S.logOk = !l.error;
    if (l.error) console.warn('marketing_log غير موجود، شغّل marketing_log.sql', l.error);
    S.data = { groups: g.data || [], tasks: t.data || [], props: p.data || [], log: l.data || [], deals: d.data || [] };
    S.loaded = !err;
    return S.data;
  }

  const propOf = id => S.data.props.find(x => String(x.id) === String(id));

  /* ---------- الذكاء: اختيار الجروب والساعة (Thompson Sampling) ---------- */
  function groupStats(tasks) {
    const m = {};
    tasks.filter(t => t.done && t.group_id && POSTABLE.includes(t.task_type)).forEach(t => (m[t.group_id] = m[t.group_id] || []).push(t.inquiries || 0));
    return m;
  }
  function hourStats(tasks) {
    const m = {};
    tasks.filter(t => t.done && POSTABLE.includes(t.task_type) && t.suggested_hour != null).forEach(t => (m[t.suggested_hour] = m[t.suggested_hour] || []).push(t.inquiries || 0));
    return m;
  }
  function bestHour(tasks) {
    const m = hourStats(tasks);
    const total = sum(Object.values(m).map(a => a.length));
    if (total < 12) return null;
    let best = null, bv = -1;
    Object.entries(m).forEach(([h, a]) => { if (a.length >= 2 && avg(a) > bv) { bv = avg(a); best = +h; } });
    return best;
  }

  async function generatePlan(property, startDate) {
    const { groups, tasks } = await loadData();
    const active = groups.filter(g => g.active !== false);
    const base = startDate ? new Date(startDate) : new Date();
    const gs = groupStats(tasks), hs = hourStats(tasks);
    const local = tasks.slice(), rows = [];

    PLAN.forEach(step => {
      const due = iso(addDays(base, step.day));
      let gid = null;
      if (step.group && active.length) {
        const ok = active.filter(g => {
          const max = g.max_posts_per_week || 3;
          const inWeek = local.filter(t => t.group_id === g.id && dayDiff(due, t.due_date) >= 0 && dayDiff(due, t.due_date) < 7).length;
          const sameProp = local.some(t => t.group_id === g.id && String(t.property_id) === String(property.id) && Math.abs(dayDiff(due, t.due_date)) < 7);
          return inWeek < max && !sameProp;
        });
        if (ok.length) gid = pickThompson(ok, g => gs[g.id]).id;
      }
      let hour = 12;
      if (POSTABLE.includes(step.type)) hour = pickThompson(TEST_HOURS, h => hs[h]);
      const row = { property_id: property.id, group_id: gid, task_type: step.type, due_date: due, suggested_hour: hour };
      rows.push(row); local.push(row);
    });

    const { error } = await db.from('marketing_tasks').insert(rows);
    if (error) { console.error(error); say('تعذر إنشاء الخطة', 'error'); return false; }
    say('تم إنشاء خطة التسويق للعقار ✅');
    return true;
  }
  window.generateMarketingPlan = async function (property) { const ok = await generatePlan(property); if (ok) refresh(); return ok; };

  /* ---------- الأنماط ---------- */
  function injectCSS() {
    if ($('#mk-style')) return;
    const st = el('style'); st.id = 'mk-style';
    st.textContent = `
    #tab-marketing{font-family:'Cairo',Tahoma,sans-serif;font-size:15px;line-height:1.7;color:inherit}
    #tab-marketing *{font-family:inherit;box-sizing:border-box}
    .mk-nav{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px;margin-bottom:6px;scrollbar-width:thin}
    .mk-nav button{flex:0 0 auto;border:1px solid rgba(128,128,128,.35);background:rgba(128,128,128,.12);color:inherit;border-radius:999px;padding:8px 16px;cursor:pointer;font-size:14px;font-weight:600}
    .mk-nav button.on{background:#4f46e5;border-color:#4f46e5;color:#fff}
    .mk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
    .mk-card{border:1px solid rgba(128,128,128,.28);background:rgba(128,128,128,.07);border-radius:16px;padding:16px;margin-bottom:14px}
    .mk-card h4{margin:0 0 4px;font-size:16px;font-weight:700;color:inherit}
    .mk-card h3,.mk-h{margin:18px 0 10px;font-size:17px;font-weight:700;color:inherit}
    .mk-meta{font-size:13px;opacity:.8;margin-bottom:8px}
    .mk-chip{display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;background:rgba(79,70,229,.18);color:inherit;margin-left:6px}
    .mk-chip.late{background:rgba(220,38,38,.2)}
    .mk-chip.good{background:rgba(22,163,74,.22)}
    .mk-text{white-space:pre-wrap;background:rgba(22,163,74,.12);border:1px dashed rgba(22,163,74,.6);border-radius:12px;padding:12px 14px;margin:10px 0;font-size:15px;line-height:1.9;color:inherit}
    .mk-warn{background:rgba(245,158,11,.16);border-right:4px solid #f59e0b;border-radius:10px;padding:8px 12px;margin:8px 0;font-size:13.5px;color:inherit}
    .mk-ok{background:rgba(22,163,74,.14);border-right:4px solid #16a34a;border-radius:10px;padding:8px 12px;margin:8px 0;font-size:14px;color:inherit}
    .mk-bad{background:rgba(220,38,38,.14);border-right:4px solid #dc2626;border-radius:10px;padding:8px 12px;margin:8px 0;font-size:14px;color:inherit}
    .mk-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
    .mk-btn{border:0;border-radius:10px;padding:9px 16px;cursor:pointer;font-size:14px;font-weight:600;background:#16a34a;color:#fff}
    .mk-btn.sec{background:rgba(128,128,128,.28);color:inherit}
    .mk-btn.red{background:#dc2626;color:#fff}
    .mk-btn.wa{background:#25d366;color:#fff;text-decoration:none;display:inline-block}
    .mk-btn.blue{background:#4f46e5;color:#fff}
    .mk-in{border:1px solid rgba(128,128,128,.45);background:rgba(128,128,128,.12);color:inherit;border-radius:10px;padding:9px 12px;font-size:14px;width:100%}
    .mk-in.sm{width:110px}
    textarea.mk-in{min-height:84px;resize:vertical}
    .mk-form{display:grid;gap:8px;margin-top:8px}
    .mk-lbl{font-size:12.5px;opacity:.8;margin-bottom:2px;display:block}
    .mk-counter{display:inline-flex;align-items:center;gap:6px;background:rgba(128,128,128,.18);border-radius:10px;padding:3px 6px}
    .mk-counter b{min-width:26px;text-align:center;font-size:16px}
    .mk-counter button{border:0;background:rgba(128,128,128,.3);color:inherit;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer}
    .mk-empty{text-align:center;opacity:.7;padding:34px 10px}
    .mk-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
    .mk-cbox{border:1px solid rgba(128,128,128,.28);background:rgba(128,128,128,.07);border-radius:16px;padding:14px}
    .mk-cbox h4{margin:0 0 8px;font-size:15px}
    .mk-cwrap{position:relative;height:240px}
    .mk-match-row{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(128,128,128,.25)}
    .mk-day{margin:18px 0 8px;font-weight:700;font-size:16px}
    .mk-tabbadge{background:#dc2626;color:#fff;border-radius:999px;font-size:11px;padding:1px 7px;margin-right:6px}
    .mk-verdict{border-radius:16px;padding:18px;margin-bottom:14px;font-size:18px;font-weight:700;text-align:center}
    .mk-verdict.up{background:rgba(22,163,74,.18);border:1px solid rgba(22,163,74,.6)}
    .mk-verdict.down{background:rgba(220,38,38,.18);border:1px solid rgba(220,38,38,.6)}
    .mk-verdict.flat{background:rgba(245,158,11,.18);border:1px solid rgba(245,158,11,.6)}
    .mk-verdict small{display:block;font-size:13px;font-weight:500;opacity:.85;margin-top:4px}
    .mk-tbl{width:100%;border-collapse:collapse;font-size:14px}
    .mk-tbl th,.mk-tbl td{padding:8px 10px;border-bottom:1px solid rgba(128,128,128,.25);text-align:right}
    .mk-tbl th{font-size:12.5px;opacity:.8}
    .mk-up{color:#16a34a;font-weight:700}.mk-dn{color:#dc2626;font-weight:700}.mk-eq{opacity:.7}
    .mk-fun{margin:6px 0}

.mk-fun .bar {
  height: 34px;
  min-width: max-content;
  box-sizing: border-box;
  border-radius: 9px;
  background: linear-gradient(90deg, #4f46e5, #16a34a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
}
    .mk-fun .conv{font-size:12.5px;opacity:.8;margin:2px 0 0 4px}
    .mk-logitem{border-bottom:1px solid rgba(128,128,128,.25);padding:10px 0}
    .mk-logitem:last-child{border:0}
    `;
    document.head.appendChild(st);
  }

  /* ---------- بناء التبويب جوه الموقع ---------- */
  function mountTab() {
    if ($('#tab-marketing')) return true;
    const firstBtn = document.querySelector('.tab-btn'), firstTab = document.querySelector('.tab');
    if (!firstBtn || !firstTab) return false;

    const b = el('button', firstBtn.className.replace('active', '').trim());
    b.dataset.tab = 'marketing'; b.id = 'mk-tab-btn'; b.type = 'button';
    b.innerHTML = '📣 التسويق<span class="mk-tabbadge" id="mk-badge" style="display:none"></span>';
    firstBtn.parentElement.appendChild(b);

    const sec = el('div', 'tab'); sec.id = 'tab-marketing';
    sec.innerHTML = '<div class="mk-nav" id="mk-nav"></div><div id="mk-body"></div>';
    firstTab.parentElement.appendChild(sec);

    b.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); sec.classList.add('active');
      refresh();
    });
    return true;
  }

  const NAV = [['today', '📅 النهاردة'], ['week', '🗓 الأسبوع'], ['log', '📓 سجل اليوم'], ['reports', '📑 التقارير'], ['props', '🏠 العقارات'], ['groups', '👥 الجروبات'], ['stats', '📊 تحليل الأداء']];

  async function refresh() { await loadData(); updateBadge(); render(); }

  function updateBadge() {
    if (!S.data) return;
    const n = S.data.tasks.filter(t => !t.done && t.due_date <= today() && t.task_type !== 'review' && isLive(t)).length;
    const bd = $('#mk-badge'); if (!bd) return;
    bd.textContent = n; bd.style.display = n ? 'inline' : 'none';
  }
  const isLive = t => { const p = propOf(t.property_id); return p && p.status !== 'sold'; };

  function render() {
    const nav = $('#mk-nav'), body = $('#mk-body'); if (!nav || !S.data) return;
    nav.innerHTML = '';
    NAV.forEach(([k, l]) => { const x = el('button', S.tab === k ? 'on' : '', l); x.type = 'button'; x.onclick = () => { S.tab = k; render(); }; nav.appendChild(x); });
    body.innerHTML = '';
    ({ today: vToday, week: vWeek, log: vLog, reports: vReports, props: vProps, groups: vGroups, stats: vStats }[S.tab])(body);
  }

  /* ---------- بطاقة مهمة ---------- */
  function taskCard(t) {
    const p = propOf(t.property_id) || {}, g = S.data.groups.find(x => x.id === t.group_id), m = META[t.task_type] || {};
    const i = info(p);
    const sibs = S.data.tasks.filter(x => String(x.property_id) === String(t.property_id)).sort((a, b) => a.due_date.localeCompare(b.due_date));
    const variant = sibs.findIndex(x => x.id === t.id) + (g ? S.data.groups.indexOf(g) : 0);
    const late = t.due_date < today() && !t.done;

    const c = el('div', 'mk-card');
    c.innerHTML = `<h4>${m.icon || ''} ${esc(m.label || t.task_type)} — ${esc(i.type)} في ${esc(i.hood)}
        ${late ? '<span class="mk-chip late">متأخرة</span>' : ''}${t.done ? '<span class="mk-chip">تم ✔</span>' : ''}</h4>
      <div class="mk-meta">📆 ${esc(t.due_date)} &nbsp;•&nbsp; ⏰ الوقت المقترح ${fmtHour(t.suggested_hour)}${g ? ' &nbsp;•&nbsp; 👥 ' + esc(g.name) : ''}</div>
      ${g && g.rules ? `<div class="mk-warn">⚠️ قواعد الجروب: ${esc(g.rules)}</div>` : ''}
      ${POSTABLE.includes(t.task_type) ? `<div class="mk-text">${esc(postText(t, p, variant))}</div>` : ''}
      ${t.task_type === 'review' ? `<div class="mk-ok">${esc(tips('review'))}</div>` : ''}
      ${t.task_type === 'match' ? '<div class="mk-match"></div>' : ''}
      ${POSTABLE.includes(t.task_type) ? `<div class="mk-meta">${esc(tips(t.task_type))}</div>` : ''}
      <div class="mk-row"></div>`;
    const row = $('.mk-row', c);

    if (POSTABLE.includes(t.task_type)) {
      row.appendChild(btn('📋 نسخ البوست', '', () => navigator.clipboard.writeText(postText(t, p, variant)).then(() => say('تم النسخ ✅'), () => say('تعذر النسخ', 'error'))));
    }
    if (t.task_type === 'match') row.appendChild(btn('👥 عرض العملاء المطابقين', 'wa', () => showMatches(p, $('.mk-match', c))));

    if (!t.done) {
      row.appendChild(btn(t.task_type === 'review' || t.task_type === 'match' ? '✔ تمت' : '✔ تم النشر', 'blue', async () => {
        await db.from('marketing_tasks').update({ done: true, posted_at: new Date().toISOString() }).eq('id', t.id); refresh();
      }));
    } else {
      row.appendChild(btn('↩ تراجع', 'sec', async () => { await db.from('marketing_tasks').update({ done: false, posted_at: null }).eq('id', t.id); refresh(); }));
    }
    if (POSTABLE.includes(t.task_type)) {
      const cnt = el('span', 'mk-counter');
      const val = el('b', '', t.inquiries || 0);
      const set = async (n) => { n = Math.max(0, n); t.inquiries = n; val.textContent = n; await db.from('marketing_tasks').update({ inquiries: n }).eq('id', t.id); };
      const minus = el('button', '', '−'), plus = el('button', '', '+');
      minus.type = plus.type = 'button';
      minus.onclick = () => set((t.inquiries || 0) - 1); plus.onclick = () => set((t.inquiries || 0) + 1);
      cnt.append(minus, val, plus);
      row.appendChild(el('span', 'mk-meta', 'استفسارات:')); row.appendChild(cnt);
    }
    return c;
  }

  /* ---------- النهاردة ---------- */
  function vToday(body) {
    const t = today();
    const list = S.data.tasks.filter(x => !x.done && x.due_date <= t && isLive(x));
    const doneToday = S.data.tasks.filter(x => x.done && (x.posted_at || '').slice(0, 10) === t).length;
    const stale = staleProps();
    const loggedToday = S.data.log.some(x => x.log_date === t);

    body.appendChild(el('div', 'mk-ok', `💡 أول ساعة بعد النشر خليك متاح للرد. السعر ما بيتكتبش في البوست. تم النهاردة: <b>${doneToday}</b> • متبقي: <b>${list.length}</b>`));
    if (!S.logOk) body.appendChild(el('div', 'mk-bad', '📓 جدول السجل غير موجود. شغّل ملف marketing_log.sql في Supabase عشان تفعّل السجل والتقارير.'));
    else if (!loggedToday) body.appendChild(el('div', 'mk-warn', '📓 لسه ماسجلتش يومك. روح "سجل اليوم" واكتب اللي حصل (30 ثانية) عشان التقارير تفضل دقيقة.'));
    if (stale.length) body.appendChild(el('div', 'mk-warn', `⚠️ عندك ${stale.length} عقار راكد (14 يوم بأقل من 3 استفسارات). افتح تبويب "تحليل الأداء" للتفاصيل.`));
    if (!S.data.groups.length) body.appendChild(el('div', 'mk-warn', '👥 ضيف جروباتك الأول من تبويب "الجروبات" عشان الخطة تتوزع عليها.'));

    if (!list.length) { body.appendChild(el('div', 'mk-empty', 'مفيش مهام النهاردة 🎉<br>ضيف عقار أو ابدأ خطة من تبويب "العقارات".')); return; }
    const late = list.filter(x => x.due_date < t), now = list.filter(x => x.due_date === t);
    if (late.length) { body.appendChild(el('div', 'mk-h', '⚠️ متأخرة')); late.forEach(x => body.appendChild(taskCard(x))); }
    if (now.length) { body.appendChild(el('div', 'mk-h', '🔔 مهام النهاردة')); now.forEach(x => body.appendChild(taskCard(x))); }
  }

  /* ---------- الأسبوع ---------- */
  function vWeek(body) {
    const t = today(), end = iso(addDays(new Date(), 7));
    const list = S.data.tasks.filter(x => !x.done && x.due_date > t && x.due_date <= end && isLive(x));
    if (!list.length) body.appendChild(el('div', 'mk-empty', 'مفيش مهام مجدولة في الـ 7 أيام الجاية'));
    const byDay = {};
    list.forEach(x => (byDay[x.due_date] = byDay[x.due_date] || []).push(x));
    Object.keys(byDay).sort().forEach(d => {
      body.appendChild(el('div', 'mk-day', `${DAYS_AR[new Date(d + 'T00:00:00').getDay()]} — ${d} (${byDay[d].length})`));
      byDay[d].forEach(x => body.appendChild(taskCard(x)));
    });
    const recent = S.data.tasks.filter(x => x.done && POSTABLE.includes(x.task_type)).sort((a, b) => (b.posted_at || '').localeCompare(a.posted_at || '')).slice(0, 10);
    if (recent.length) { body.appendChild(el('div', 'mk-h', '🕘 اتنفذت مؤخرًا (عدّل الاستفسارات)')); recent.forEach(x => body.appendChild(taskCard(x))); }
  }

  /* ---------- سجل اليوم ---------- */
  function vLog(body) {
    if (!S.logOk) { body.appendChild(el('div', 'mk-bad', 'جدول marketing_log غير موجود. شغّل ملف <b>marketing_log.sql</b> في Supabase (SQL Editor) ثم حدّث الصفحة.')); return; }

    const propOpts = '<option value="">— بدون عقار محدد —</option>' + S.data.props.map(p => { const i = info(p); return `<option value="${esc(p.id)}">${esc(i.type)} - ${esc(i.hood)}</option>`; }).join('');
    const grpOpts = '<option value="">— بدون جروب —</option>' + S.data.groups.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');

    const form = el('div', 'mk-card', `<h4>📓 سجّل اللي حصل</h4>
      <div class="mk-meta">اكتب بصراحة. الأرقام دي هي اللي بيتحسب منها تقرير التقدّم.</div>
      <div class="mk-form">
        <div><span class="mk-lbl">التاريخ</span><input class="mk-in" id="lg-date" type="date" value="${today()}"></div>
        <div><span class="mk-lbl">العقار</span><select class="mk-in" id="lg-prop">${propOpts}</select></div>
        <div><span class="mk-lbl">الجروب</span><select class="mk-in" id="lg-grp">${grpOpts}</select></div>
        <div><span class="mk-lbl">حصل إيه؟</span><textarea class="mk-in" id="lg-notes" placeholder="مثال: نشرت الإعلان في جروب كذا، جالي 3 رسايل، واحد حجز معاينة بكرة..."></textarea></div>
        <div class="mk-row" style="margin:0">
          <div><span class="mk-lbl">استفسارات</span><input class="mk-in sm" id="lg-inq" type="number" min="0" value="0"></div>
          <div><span class="mk-lbl">معاينات</span><input class="mk-in sm" id="lg-view" type="number" min="0" value="0"></div>
          <div><span class="mk-lbl">عروض أسعار</span><input class="mk-in sm" id="lg-off" type="number" min="0" value="0"></div>
          <div><span class="mk-lbl">تقييم اليوم</span><select class="mk-in sm" id="lg-mood"><option value="good">ممتاز 🔥</option><option value="ok" selected>عادي 🙂</option><option value="bad">ضعيف 😕</option></select></div>
        </div>
      </div><div class="mk-row" id="lg-add"></div>`);
    body.appendChild(form);
    $('#lg-add', form).appendChild(btn('💾 حفظ السجل', '', async () => {
      const notes = $('#lg-notes', form).value.trim();
      const row = {
        log_date: $('#lg-date', form).value || today(),
        property_id: $('#lg-prop', form).value || null,
        group_id: $('#lg-grp', form).value || null,
        notes: notes || null,
        inquiries: Math.max(0, parseInt($('#lg-inq', form).value) || 0),
        viewings: Math.max(0, parseInt($('#lg-view', form).value) || 0),
        offers: Math.max(0, parseInt($('#lg-off', form).value) || 0),
        mood: $('#lg-mood', form).value
      };
      if (!notes && !row.inquiries && !row.viewings && !row.offers) return say('اكتب ملاحظة أو سجّل رقم واحد على الأقل', 'warning');
      const { error } = await db.from('marketing_log').insert(row);
      if (error) { console.error(error); return say('تعذر الحفظ', 'error'); }
      say('تم تسجيل يومك ✅'); refresh();
    }));

    // ملخص اليوم
    const t = today(), tl = S.data.log.filter(x => x.log_date === t);
    if (tl.length) body.appendChild(el('div', 'mk-ok', `النهاردة: استفسارات <b>${sum(tl.map(x => num(x.inquiries)))}</b> • معاينات <b>${sum(tl.map(x => num(x.viewings)))}</b> • عروض <b>${sum(tl.map(x => num(x.offers)))}</b>`));

    body.appendChild(el('div', 'mk-h', '🕘 آخر السجلات'));
    const list = S.data.log.slice(0, 40);
    if (!list.length) { body.appendChild(el('div', 'mk-empty', 'لسه ما سجلتش حاجة')); return; }
    const card = el('div', 'mk-card');
    const moodIc = { good: '🔥', ok: '🙂', bad: '😕' };
    list.forEach(x => {
      const p = x.property_id ? propOf(x.property_id) : null, g = x.group_id ? S.data.groups.find(z => String(z.id) === String(x.group_id)) : null;
      const it = el('div', 'mk-logitem', `<div><b>${esc(x.log_date)}</b> ${moodIc[x.mood] || ''}
        ${p ? `<span class="mk-chip">${esc(info(p).type)} - ${esc(info(p).hood)}</span>` : ''}${g ? `<span class="mk-chip">${esc(g.name)}</span>` : ''}</div>
        ${x.notes ? `<div style="white-space:pre-wrap;margin:4px 0">${esc(x.notes)}</div>` : ''}
        <div class="mk-meta">📩 ${num(x.inquiries)} استفسار • 👁 ${num(x.viewings)} معاينة • 📄 ${num(x.offers)} عرض</div><div class="mk-row"></div>`);
      $('.mk-row', it).appendChild(btn('حذف', 'red', async () => {
        const ok = typeof confirmDialog === 'function' ? await confirmDialog('حذف السجل ده؟') : confirm('حذف السجل ده؟');
        if (ok) { await db.from('marketing_log').delete().eq('id', x.id); refresh(); }
      }));
      card.appendChild(it);
    });
    body.appendChild(card);
  }

  /* ---------- التقارير ---------- */
  const RPT = { week: [7, 'أسبوعي (7 أيام)'], month: [30, 'شهري (30 يوم)'], quarter: [90, 'ربع سنوي (90 يوم)'] };

  function metrics(from, to) {
    const inR = d => d >= from && d <= to;
    const planned = S.data.tasks.filter(x => POSTABLE.includes(x.task_type) && inR(x.due_date) && propOf(x.property_id));
    const done = planned.filter(x => x.done);
    const logs = S.data.log.filter(x => inR(x.log_date));
    const deals = S.data.deals.filter(d => d.status === 'completed' && d.deal_date && inR(String(d.deal_date).slice(0, 10)));
    const postInq = sum(done.map(x => num(x.inquiries))), logInq = sum(logs.map(x => num(x.inquiries)));
    return {
      posts: done.length, planned: planned.length,
      compliance: planned.length ? Math.round(done.length / planned.length * 100) : 0,
      postInq, logInq, inquiries: Math.max(postInq, logInq),
      viewings: sum(logs.map(x => num(x.viewings))), offers: sum(logs.map(x => num(x.offers))),
      deals: deals.length, dealValue: sum(deals.map(d => num(d.agreed_price))),
      logDays: new Set(logs.map(x => x.log_date)).size, logs
    };
  }

  function delta(cur, prev, invert) {
    if (!prev && !cur) return '<span class="mk-eq">—</span>';
    if (!prev) return '<span class="mk-up">جديد ▲</span>';
    const pct = Math.round((cur - prev) / prev * 100);
    if (pct === 0) return '<span class="mk-eq">ثابت ═</span>';
    const good = invert ? pct < 0 : pct > 0;
    return `<span class="${good ? 'mk-up' : 'mk-dn'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
  }

  function funnelHTML(m) {
    const steps = [['📩 استفسارات', m.inquiries], ['👁 معاينات', m.viewings], ['📄 عروض', m.offers], ['🤝 صفقات', m.deals]];
    const top = Math.max(steps[0][1], 1);
    return steps.map((s, i) => {
      const w = Math.max(8, Math.round(s[1] / top * 100));
      const conv = i ? (steps[i - 1][1] ? Math.round(s[1] / steps[i - 1][1] * 100) + '% من المرحلة اللي قبلها' : '—') : 'بداية القمع';
      return `<div class="mk-fun"><div class="bar" style="width:${w}%">${s[0]}: ${s[1]}</div><div class="conv">${conv}</div></div>`;
    }).join('');
  }

  function funnelDiagnosis(m) {
    if (m.inquiries < 5) return 'الوصول لسه ضعيف: ركّز على النشر المنتظم وجودة الصور والبوست الأول.';
    if (m.viewings / m.inquiries < 0.15) return 'المشكلة في تحويل الاستفسار لمعاينة: رد أسرع (أول ساعة)، وكلّم العميل واتساب/تليفون، واعرض موعد معاينة محدد بدل "تحب تيجي؟".';
    if (m.viewings && m.offers / m.viewings < 0.25) return 'المعاينات بتحصل بس مفيش عروض: راجع المعاينة نفسها (نظافة، توقيت، تحضير الأسئلة الشائعة) وتأكد إن العميل مناسب للميزانية.';
    if (m.offers && m.deals / m.offers < 0.2) return 'العروض كتير والإغلاق قليل: راجع السعر والتفاوض، وتابع كل عرض خلال 48 ساعة.';
    return 'القمع متوازن. الأولوية دلوقتي زيادة الحجم (استفسارات أكتر) مع الحفاظ على نسب التحويل.';
  }

  function vReports(body) {
    if (!S.logOk) body.appendChild(el('div', 'mk-warn', '📓 جدول السجل غير مفعّل. التقارير هتعتمد على بيانات البوستات بس لحد ما تشغّل marketing_log.sql.'));

    const nav = el('div', 'mk-nav');
    Object.entries(RPT).forEach(([k, [, l]]) => { const b = el('button', S.rpt === k ? 'on' : '', l); b.type = 'button'; b.onclick = () => { S.rpt = k; render(); }; nav.appendChild(b); });
    body.appendChild(nav);

    const n = RPT[S.rpt][0], t = new Date();
    const cFrom = iso(addDays(t, -(n - 1))), cTo = iso(t), pFrom = iso(addDays(t, -(2 * n - 1))), pTo = iso(addDays(t, -n));
    const cur = metrics(cFrom, cTo), prev = metrics(pFrom, pTo);

    // الحكم: بنتقدم ولا لا؟
    const keys = [['inquiries', 1], ['viewings', 1], ['offers', 1], ['deals', 1], ['compliance', 1]];
    let ups = 0, downs = 0;
    keys.forEach(([k]) => { if (cur[k] > prev[k]) ups++; else if (cur[k] < prev[k]) downs++; });
    const empty = !cur.inquiries && !cur.posts && !cur.logDays && !prev.inquiries && !prev.posts;
    let cls = 'flat', head = '➖ ثابت: مفيش تغيير واضح عن الفترة السابقة';
    if (empty) head = '📭 لسه مفيش بيانات كفاية للحكم';
    else if (ups > downs) { cls = 'up'; head = '📈 بنتقدم: الأرقام أحسن من الفترة السابقة'; }
    else if (downs > ups) { cls = 'down'; head = '📉 بنتراجع: الأرقام أضعف من الفترة السابقة'; }
    body.appendChild(el('div', 'mk-verdict ' + cls, `${head}<small>${cFrom} → ${cTo} مقابل ${pFrom} → ${pTo} • تحسّن في ${ups} مؤشر وتراجع في ${downs} من ${keys.length}</small>`));

    // جدول المقارنة
    const rows = [
      ['📝 بوستات منفذة', 'posts'], ['🎯 نسبة الالتزام %', 'compliance'], ['📩 استفسارات', 'inquiries'],
      ['👁 معاينات', 'viewings'], ['📄 عروض أسعار', 'offers'], ['🤝 صفقات مكتملة', 'deals'], ['💼 قيمة الصفقات', 'dealValue'], ['📓 أيام مسجلة', 'logDays']
    ];
    const tbl = el('div', 'mk-card', '<h4>📊 مقارنة الفترة الحالية بالسابقة</h4>');
    let h = '<table class="mk-tbl"><tr><th>المؤشر</th><th>الحالية</th><th>السابقة</th><th>التغيّر</th></tr>';
    rows.forEach(([l, k]) => { h += `<tr><td>${l}</td><td><b>${k === 'dealValue' ? fmtN(cur[k]) : cur[k]}</b></td><td>${k === 'dealValue' ? fmtN(prev[k]) : prev[k]}</td><td>${delta(cur[k], prev[k])}</td></tr>`; });
    h += `<tr><td>⭐ استفسار/بوست</td><td><b>${cur.posts ? r1(cur.postInq / cur.posts) : 0}</b></td><td>${prev.posts ? r1(prev.postInq / prev.posts) : 0}</td><td>${delta(cur.posts ? cur.postInq / cur.posts : 0, prev.posts ? prev.postInq / prev.posts : 0)}</td></tr></table>`;
    tbl.insertAdjacentHTML('beforeend', h);
    body.appendChild(tbl);

    // Funnel
    const fc = el('div', 'mk-card', `<h4>🔻 قمع المبيعات (الفترة الحالية)</h4>${funnelHTML(cur)}<div class="mk-ok">🩺 التشخيص: ${esc(funnelDiagnosis(cur))}</div>
      <div class="mk-meta">الاستفسارات = الأكبر بين مجموع عدّاد البوستات وسجل اليوم (عشان ما نحسبش نفس الاستفسار مرتين).</div>`);
    body.appendChild(fc);

    // يوميات الفترة
    const lc = el('div', 'mk-card', '<h4>📓 يوميات الفترة (اللي حصل)</h4>');
    const logs = cur.logs.slice().sort((a, b) => b.log_date.localeCompare(a.log_date));
    if (!logs.length) lc.appendChild(el('div', 'mk-meta', 'مفيش سجلات في الفترة دي'));
    logs.slice(0, 30).forEach(x => lc.appendChild(el('div', 'mk-logitem', `<b>${esc(x.log_date)}</b> — ${esc(x.notes || '')} <span class="mk-meta">(📩${num(x.inquiries)} 👁${num(x.viewings)} 📄${num(x.offers)})</span>`)));
    body.appendChild(lc);

    // اتجاه 8 أسابيع
    const tc = el('div', 'mk-cbox', '<h4>📈 اتجاه آخر 8 أسابيع</h4><div class="mk-cwrap"><canvas id="mk-ch-trend"></canvas></div>');
    body.appendChild(tc);
    const labels = [], inq = [], vw = [];
    for (let w = 7; w >= 0; w--) {
      const m = metrics(iso(addDays(t, -(w * 7 + 6))), iso(addDays(t, -w * 7)));
      labels.push(iso(addDays(t, -w * 7)).slice(5)); inq.push(m.inquiries); vw.push(m.viewings);
    }
    if (typeof Chart !== 'undefined') {
      try { if (typeof charts !== 'undefined' && charts['mk-ch-trend']) charts['mk-ch-trend'].destroy(); } catch (e) { }
      const c = new Chart(document.getElementById('mk-ch-trend'), {
        type: 'line',
        data: { labels, datasets: [
          { label: 'استفسارات', data: inq, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.15)', fill: true, tension: .4, pointRadius: 4 },
          { label: 'معاينات', data: vw, borderColor: '#16a34a', tension: .4, pointRadius: 4 }
        ] },
        options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
      if (typeof charts !== 'undefined') charts['mk-ch-trend'] = c;
    }

    // أداء كل عقار (KPIs)
    body.appendChild(el('div', 'mk-h', '🏠 مؤشرات كل عقار'));
    const pr = S.data.props.map(p => {
      const ts = S.data.tasks.filter(x => String(x.property_id) === String(p.id) && POSTABLE.includes(x.task_type));
      if (!ts.length) return null;
      const dn = ts.filter(x => x.done), start = ts.map(x => x.due_date).sort()[0];
      const lg = S.data.log.filter(x => String(x.property_id) === String(p.id));
      const sold = S.data.deals.find(d => String(d.property_id) === String(p.id) && d.status === 'completed');
      const end = sold && sold.deal_date ? String(sold.deal_date).slice(0, 10) : today();
      return { p, days: Math.max(0, dayDiff(end, start)), posts: dn.length, inq: Math.max(sum(dn.map(x => num(x.inquiries))), sum(lg.map(x => num(x.inquiries)))), view: sum(lg.map(x => num(x.viewings))), off: sum(lg.map(x => num(x.offers))), sold: !!sold };
    }).filter(Boolean).sort((a, b) => b.inq - a.inq);
    if (!pr.length) body.appendChild(el('div', 'mk-empty', 'لا توجد خطط بعد'));
    pr.forEach(x => { const i = info(x.p); body.appendChild(el('div', 'mk-card', `<h4>${esc(i.type)} في ${esc(i.hood)} ${x.sold ? '<span class="mk-chip good">اتباع ✔</span>' : ''}</h4>
      <div class="mk-meta">⏳ ${x.days} يوم في السوق • 📝 ${x.posts} بوست • 📩 ${x.inq} استفسار • 👁 ${x.view} معاينة • 📄 ${x.off} عرض • ⭐ ${x.posts ? r1(x.inq / x.posts) : 0} استفسار/بوست</div>`)); });

    // نسخ التقرير نصًا (واتساب/ملاحظات)
    const txt = [
      `📑 تقرير التسويق ${RPT[S.rpt][1]}`, `${cFrom} → ${cTo}`, head, '',
      `بوستات: ${cur.posts} (السابق ${prev.posts}) • التزام ${cur.compliance}%`,
      `استفسارات: ${cur.inquiries} (السابق ${prev.inquiries})`, `معاينات: ${cur.viewings} (السابق ${prev.viewings})`,
      `عروض: ${cur.offers} (السابق ${prev.offers})`, `صفقات: ${cur.deals} (السابق ${prev.deals}) • قيمة ${fmtN(cur.dealValue)} جنيه`, '',
      '🩺 ' + funnelDiagnosis(cur)
    ].join('\n');
    const rw = el('div', 'mk-row');
    rw.appendChild(btn('📋 نسخ التقرير كنص', 'blue', () => navigator.clipboard.writeText(txt).then(() => say('تم نسخ التقرير ✅'), () => say('تعذر النسخ', 'error'))));
    rw.appendChild(btn('🖨 طباعة / PDF', 'sec', () => window.print()));
    body.appendChild(rw);
  }

  /* ---------- العقارات ---------- */
  function vProps(body) {
    const { props, tasks } = S.data;
    const has = p => tasks.some(t => String(t.property_id) === String(p.id));
    const without = props.filter(p => !has(p) && p.status !== 'sold');
    const withPlan = props.filter(has);

    body.appendChild(el('div', 'mk-h', `عقارات بدون خطة (${without.length})`));
    if (!without.length) body.appendChild(el('div', 'mk-empty', 'كل عقاراتك ليها خطة ✔'));
    without.forEach(p => {
      const i = info(p), c = el('div', 'mk-card', `<h4>🏠 ${esc(i.type)} في ${esc(i.hood)}</h4><div class="mk-meta">${esc(i.specs.join(' • '))}</div><div class="mk-row"></div>`);
      $('.mk-row', c).appendChild(btn('⚡ ابدأ خطة من النهاردة', '', async () => { if (await generatePlan(p)) refresh(); }));
      body.appendChild(c);
    });

    if (withPlan.length) body.appendChild(el('div', 'mk-h', 'عقارات عليها خطة'));
    withPlan.forEach(p => {
      const i = info(p), ts = tasks.filter(t => String(t.property_id) === String(p.id));
      const post = ts.filter(t => POSTABLE.includes(t.task_type)), done = post.filter(t => t.done);
      const inq = post.reduce((s, t) => s + (t.inquiries || 0), 0);
      const pct = post.length ? Math.round(done.length / post.length * 100) : 0;
      body.appendChild(el('div', 'mk-card', `<h4>🏠 ${esc(i.type)} في ${esc(i.hood)}</h4>
        <div class="mk-meta">منشور ${done.length}/${post.length} (${pct}%) • الاستفسارات ${inq}${p.status === 'sold' ? ' • مباع' : ''}</div>`));
    });
  }

  /* ---------- الجروبات ---------- */
  function vGroups(body) {
    const { groups, tasks } = S.data;
    const form = el('div', 'mk-card', `<h4>➕ إضافة جروب</h4>
      <div style="display:grid;gap:8px;margin-top:8px">
      <input class="mk-in" id="g-name" placeholder="اسم الجروب">
      <div class="mk-row" style="margin:0"><input class="mk-in sm" id="g-mem" type="number" placeholder="الأعضاء"><input class="mk-in sm" id="g-max" type="number" placeholder="حد/أسبوع" value="3"></div>
      <input class="mk-in" id="g-rules" placeholder="قواعد الجروب (ممنوع أسعار / موافقة الأدمن / ...)"></div><div class="mk-row" id="g-add"></div>`);
    body.appendChild(form);
    $('#g-add', form).appendChild(btn('💾 حفظ الجروب', '', async () => {
      const name = $('#g-name').value.trim(); if (!name) return say('اكتب اسم الجروب', 'warning');
      const { error } = await db.from('marketing_groups').insert({ name, members: +$('#g-mem').value || null, max_posts_per_week: +$('#g-max').value || 3, rules: $('#g-rules').value.trim() });
      if (error) { console.error(error); return say('تعذر الحفظ', 'error'); }
      say('تمت إضافة الجروب'); refresh();
    }));

    if (!groups.length) body.appendChild(el('div', 'mk-empty', 'لسه ما ضفتش جروبات'));
    groups.forEach(g => {
      const ts = tasks.filter(t => t.group_id === g.id && t.done && POSTABLE.includes(t.task_type)), inq = ts.reduce((s, t) => s + (t.inquiries || 0), 0);
      const c = el('div', 'mk-card', `<h4>👥 ${esc(g.name)} ${g.active === false ? '<span class="mk-chip late">موقوف</span>' : ''}</h4>
        <div class="mk-meta">${g.members ? g.members.toLocaleString('en-US') + ' عضو • ' : ''}حد ${g.max_posts_per_week}/أسبوع • نُشر ${ts.length} • استفسارات ${inq} • متوسط ${ts.length ? r1(inq / ts.length) : 0}</div>
        ${g.rules ? `<div class="mk-warn">${esc(g.rules)}</div>` : ''}<div class="mk-row"></div>`);
      const r = $('.mk-row', c);
      r.appendChild(btn(g.active === false ? 'تفعيل' : 'إيقاف', 'sec', async () => { await db.from('marketing_groups').update({ active: g.active === false }).eq('id', g.id); refresh(); }));
      r.appendChild(btn('حذف', 'red', async () => {
        const ok = typeof confirmDialog === 'function' ? await confirmDialog('حذف الجروب؟') : confirm('حذف الجروب؟');
        if (ok) { await db.from('marketing_groups').delete().eq('id', g.id); refresh(); }
      }));
      body.appendChild(c);
    });
  }

  /* ---------- العملاء المطابقين ---------- */
  async function showMatches(p, box) {
    box.innerHTML = '<div class="mk-meta">جاري البحث...</div>';
    const { data, error } = await db.from('customers').select('*');
    if (error) { box.innerHTML = '<div class="mk-warn">تعذر تحميل العملاء</div>'; return; }
    const i = info(p), price = Number(p.price) || 0;
    const norm = s => String(s || '').trim().toLowerCase();
    const scored = (data || []).map(c => {
      let s = 0;
      if (c.preferred_type && norm(i.type).includes(norm(c.preferred_type))) s++;
      if (c.preferred_area && (norm(i.hood).includes(norm(c.preferred_area)) || norm(c.preferred_area).includes(norm(i.hood)) || norm(i.gov).includes(norm(c.preferred_area)))) s++;
      if (price && c.budget && Number(c.budget) >= price * 0.85 && Number(c.budget) <= price * 1.4) s++;
      return { c, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);

    box.innerHTML = `<div class="mk-${scored.length ? 'ok' : 'warn'}">${scored.length ? `عملاء مطابقين: ${scored.length} (مرتبين حسب قوة التطابق)` : 'مفيش عملاء مطابقين. تأكد إن العملاء عندهم "المنطقة المطلوبة" و"النوع المطلوب".'}</div>`;
    scored.slice(0, 20).forEach(({ c, s }) => {
      const clean = (c.phone || '').replace(/[^\d+]/g, '');
      let wa = clean.replace(/^\+/, ''); if (wa.startsWith('00')) wa = wa.slice(2); else if (wa.startsWith('0')) wa = '20' + wa.slice(1);
      const msg = `أهلًا ${c.name || ''}، نزل عندي ${i.type} في ${i.hood}${i.specs.length ? ' (' + i.specs.slice(0, 3).join('، ') + ')' : ''} وفكرت فيك. تحب أبعتلك التفاصيل والصور؟`;
      const row = el('div', 'mk-match-row', `<span><b>${esc(c.name || 'عميل')}</b> <span class="mk-chip">تطابق ${s}/3</span></span>`);
      if (wa) { const a = el('a', 'mk-btn wa', '💬 واتساب'); a.target = '_blank'; a.rel = 'noopener'; a.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg); row.appendChild(a); }
      else row.appendChild(el('span', 'mk-meta', 'بدون رقم'));
      box.appendChild(row);
    });
  }

  /* ---------- الراكدة ---------- */
  function staleProps() {
    const { props, tasks } = S.data, t = today();
    return props.filter(p => {
      if (p.status !== 'available') return false;
      const ts = tasks.filter(x => String(x.property_id) === String(p.id)); if (!ts.length) return false;
      const start = ts.map(x => x.due_date).sort()[0];
      const inq = ts.reduce((s, x) => s + (x.inquiries || 0), 0);
      return dayDiff(t, start) >= 14 && inq <= 2;
    });
  }

  /* ---------- تحليل الأداء ---------- */
  function vStats(body) {
    const t = today();
    const from = S.range ? iso(addDays(new Date(), -S.range)) : '0000-00-00';
    const inRange = S.data.tasks.filter(x => x.due_date >= from && x.due_date <= t && POSTABLE.includes(x.task_type) && propOf(x.property_id));
    const done = inRange.filter(x => x.done);
    const totalInq = done.reduce((s, x) => s + (x.inquiries || 0), 0);
    const overdue = S.data.tasks.filter(x => !x.done && x.due_date < t && POSTABLE.includes(x.task_type) && isLive(x)).length;
    const zero = done.filter(x => !x.inquiries).length;

    const nav = el('div', 'mk-nav');
    [[7, 'آخر 7 أيام'], [30, 'آخر 30 يوم'], [90, 'آخر 90 يوم'], [0, 'الكل']].forEach(([d, l]) => {
      const b = el('button', S.range === d ? 'on' : '', l); b.type = 'button'; b.onclick = () => { S.range = d; render(); }; nav.appendChild(b);
    });
    body.appendChild(nav);

    const kpis = [
      ['📝', 'بوستات منفذة', done.length, 'blue'],
      ['📩', 'إجمالي الاستفسارات', totalInq, 'green'],
      ['⭐', 'متوسط استفسار/بوست', done.length ? r1(totalInq / done.length) : 0, 'gold'],
      ['🎯', 'نسبة الالتزام', inRange.length ? Math.round(done.length / inRange.length * 100) + '%' : '0%', 'purple'],
      ['⏰', 'مهام متأخرة', overdue, overdue ? 'red' : 'teal'],
      ['😶', 'بوستات بدون استفسار', done.length ? Math.round(zero / done.length * 100) + '%' : '0%', 'orange']
    ];
    const grid = el('div', 'mk-grid');
    kpis.forEach(([ic, lb, val, col]) => grid.appendChild(el('div', 'stat-card has-icon ' + col, `<div class="stat-icon">${ic}</div><div><div class="stat-number">${val}</div><div class="stat-label">${lb}</div></div>`)));
    body.appendChild(grid);

    if (done.length < 6) {
      body.appendChild(el('div', 'mk-warn', `📌 التحليل محتاج بيانات: نفّذ على الأقل 6 بوستات وسجّل استفساراتها بزرار +. المنفذ دلوقتي: <b>${done.length}</b>. كل ما زادت الأرقام، التوصيات بتبقى أدق.`));
    }

    const agg = (keyFn, labelFn) => {
      const m = {}; done.forEach(x => { const k = keyFn(x); if (k == null || k === '') return; (m[k] = m[k] || []).push(x.inquiries || 0); });
      return Object.entries(m).map(([k, a]) => ({ key: k, label: labelFn(k), n: a.length, avg: avg(a), vals: a })).sort((a, b) => b.avg - a.avg);
    };
    const byHour = agg(x => x.suggested_hour, k => fmtHour(+k)).sort((a, b) => +a.key - +b.key);
    const byType = agg(x => x.task_type, k => (META[k] || {}).label || k);
    const byGroup = agg(x => x.group_id, k => (S.data.groups.find(g => g.id === k) || {}).name || 'غير معروف');
    const byDay = agg(x => new Date((x.posted_at || x.due_date + 'T12:00:00')).getDay(), k => DAYS_AR[+k]);

    const rec = [];
    const top = a => a.filter(x => x.n >= 2).sort((x, y) => y.avg - x.avg)[0];
    const vsRest = (best, all) => { const rest = [].concat(...all.filter(z => z.key !== best.key).map(z => z.vals)); return sigTest(best.vals, rest); };
    if (done.length >= 6) {
      const h = top(byHour), ty = top(byType), g = top(byGroup), d = top(byDay);
      if (h) rec.push(`⏰ أنجح وقت نشر: <b>${h.label}</b> (متوسط ${r1(h.avg)} من ${h.n} بوست) — ${sigLabel(vsRest(h, byHour))}`);
      if (d) rec.push(`📆 أنجح يوم: <b>${d.label}</b> (متوسط ${r1(d.avg)}) — ${sigLabel(vsRest(d, byDay))}`);
      if (ty) rec.push(`📝 أقوى نوع بوست: <b>${ty.label}</b> (متوسط ${r1(ty.avg)}) — ${sigLabel(vsRest(ty, byType))}`);
      if (g) rec.push(`👥 أنجح جروب: <b>${esc(g.label)}</b> (متوسط ${r1(g.avg)}) — ${sigLabel(vsRest(g, byGroup))}`);
      const weak = byGroup.filter(x => x.n >= 3 && x.avg < 0.5 * Math.max(avg(done.map(z => z.inquiries || 0)), 0.1));
      weak.forEach(w => rec.push(`🔻 جروب <b>${esc(w.label)}</b> ضعيف (${r1(w.avg)} استفسار/بوست من ${w.n}). قلّل النشر فيه أو غيّر الأسلوب.`));
      if (zero / done.length > 0.5) rec.push('😶 أكتر من نصف بوستاتك بدون استفسارات. جرّب بوستات سؤال، وريلز، وردّ أسرع في أول ساعة.');
    }
    if (inRange.length && done.length / inRange.length < 0.7) rec.push('🎯 التزامك بالخطة أقل من 70%. الاستمرارية بتفرق في الوصول أكتر من أي حاجة تانية.');
    if (overdue) rec.push(`⏰ عندك ${overdue} مهمة متأخرة. نفّذها أو احذف العقار لو اتباع.`);
    rec.push('🤖 الخطط الجديدة بتختار الجروب والساعة بخوارزمية Thompson Sampling: بتجرّب الجديد لما بياناته قليلة وبتركّز على الأفضل كل ما البيانات تتأكد.');
    const rc = el('div', 'mk-card', '<h4>💡 توصيات من بياناتك</h4>');
    rec.forEach(r => rc.appendChild(el('div', 'mk-ok', r)));
    body.appendChild(rc);

    const ch = el('div', 'mk-charts');
    [['mk-ch-hour', '⏰ متوسط الاستفسارات حسب الساعة'], ['mk-ch-day', '📆 حسب يوم الأسبوع'], ['mk-ch-type', '📝 حسب نوع البوست'], ['mk-ch-group', '👥 حسب الجروب'], ['mk-ch-week', '📈 الاستفسارات أسبوعيًا (آخر 8 أسابيع)']].forEach(([id, title]) => {
      ch.appendChild(el('div', 'mk-cbox', `<h4>${title}</h4><div class="mk-cwrap"><canvas id="${id}"></canvas></div>`));
    });
    body.appendChild(ch);

    const draw = (id, rows) => {
      if (typeof drawBar !== 'function' || !rows.length) { const c = document.getElementById(id); if (c) c.parentElement.innerHTML = '<div class="mk-empty">لا توجد بيانات</div>'; return; }
      drawBar(id, rows.map(r => r.label), rows.map(r => r1(r.avg)), ['#4f46e5', '#16a34a', '#f59e0b', '#0ea5e9', '#dc2626']);
    };
    draw('mk-ch-hour', byHour); draw('mk-ch-day', byDay.sort((a, b) => +a.key - +b.key)); draw('mk-ch-type', byType); draw('mk-ch-group', byGroup);

    const weeks = [], labels = [];
    for (let w = 7; w >= 0; w--) {
      const s = iso(addDays(new Date(), -(w * 7 + 6))), e = iso(addDays(new Date(), -w * 7));
      labels.push(e.slice(5)); weeks.push(S.data.tasks.filter(x => x.done && POSTABLE.includes(x.task_type) && x.due_date >= s && x.due_date <= e).reduce((a, x) => a + (x.inquiries || 0), 0));
    }
    if (typeof Chart !== 'undefined') {
      try { if (typeof charts !== 'undefined' && charts['mk-ch-week']) charts['mk-ch-week'].destroy(); } catch (e) { }
      const c = new Chart(document.getElementById('mk-ch-week'), {
        type: 'line',
        data: { labels, datasets: [{ label: 'استفسارات', data: weeks, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.2)', fill: true, tension: .4, pointRadius: 4 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
      if (typeof charts !== 'undefined') charts['mk-ch-week'] = c;
    }

    body.appendChild(el('div', 'mk-h', '🏠 أداء كل عقار'));
    const perProp = S.data.props.map(p => {
      const ts = S.data.tasks.filter(x => String(x.property_id) === String(p.id) && POSTABLE.includes(x.task_type));
      return { p, n: ts.filter(x => x.done).length, tot: ts.length, inq: ts.reduce((s, x) => s + (x.inquiries || 0), 0) };
    }).filter(x => x.tot).sort((a, b) => b.inq - a.inq);
    if (!perProp.length) body.appendChild(el('div', 'mk-empty', 'لا توجد خطط بعد'));
    perProp.forEach(x => { const i = info(x.p); body.appendChild(el('div', 'mk-card', `<h4>${esc(i.type)} في ${esc(i.hood)}</h4><div class="mk-meta">منشور ${x.n}/${x.tot} • استفسارات ${x.inq} • متوسط ${x.n ? r1(x.inq / x.n) : 0}/بوست</div>`)); });

    const stale = staleProps();
    body.appendChild(el('div', 'mk-h', '⚠️ العقارات الراكدة'));
    if (!stale.length) body.appendChild(el('div', 'mk-ok', 'مفيش عقارات راكدة 👌'));
    stale.forEach(p => {
      const i = info(p), c = el('div', 'mk-card', `<h4>${esc(i.type)} في ${esc(i.hood)}</h4><div class="mk-warn">عدّى 14 يوم بأقل من 3 استفسارات. جرّب: صور جديدة، عنوان مختلف، ريلز جديد، مراجعة السعر، أو إعلان مدفوع صغير على أحسن بوست.</div><div class="mk-row"></div>`);
      $('.mk-row', c).appendChild(btn('🔄 ابدأ دورة جديدة', '', async () => { if (await generatePlan(p)) refresh(); }));
      body.appendChild(c);
    });
  }

  /* ---------- تشغيل ---------- */
  async function boot() {
    if (typeof db === 'undefined') { console.warn('marketing.js: db غير موجود'); return; }
    injectCSS();
    if (!mountTab()) { setTimeout(boot, 500); return; }
    try {
      const { data } = await db.auth.getSession();
      if (data && data.session) { await loadData(); updateBadge(); }
    } catch (e) { console.error(e); }
    db.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_IN') loadData().then(updateBadge);
      if (ev === 'SIGNED_OUT') { S.data = null; const b = $('#mk-badge'); if (b) b.style.display = 'none'; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();