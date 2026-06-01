(function() {
  // 이미 실행 중이면 토글
  const existing = document.getElementById('_ep_host');
  if (existing) { existing.remove(); return; }

  const COST_TYPES = ['EA전표','소액전표','직원차량운행표','대체전표','매출외출고요청서(신)','매출외출고요청서'];
  const COST_ACCOUNTS = ['(판)접대비','(판)광고선전비','미수금(매출외)','(판)복리후생비','자가차량운행','(판)지급수수료','(판)교육훈련비','(판)경상연구개발비','(판)통신비','(판)하자보수비','(판)비품비','(판)소모품비','(판)물류비','(판)여비교통비'];

  // ── Shadow DOM 호스트 ────────────────────────────────
  const host = document.createElement('div');
  host.id = '_ep_host';
  host.style.cssText = 'position:fixed;top:0;right:0;width:800px;height:100vh;z-index:2147483647;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
<style>
  :host { all: initial; display: block; font-family: 'Pretendard','Apple SD Gothic Neo',sans-serif; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .panel {
    width: 100%; height: 100vh;
    background: #0d0f14; border-left: 2px solid #2a3145;
    display: flex; flex-direction: column;
    box-shadow: -8px 0 40px rgba(0,0,0,.7);
    color: #e8ecf4; font-size: 13px;
    font-family: 'Pretendard','Apple SD Gothic Neo',sans-serif;
  }

  /* Header */
  .hdr {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px;
    background: #161a23; border-bottom: 1px solid #2a3145;
    flex-shrink: 0;
  }
  .hdr-logo {
    background: linear-gradient(135deg, #4f7dff, #00e5c8);
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; color: #fff; flex-shrink: 0;
    font-family: monospace;
  }
  .hdr-info { display: flex; flex-direction: column; gap: 2px; }
  .hdr-title { font-size: 15px; font-weight: 700; color: #e8ecf4; line-height: 1.2; }
  .hdr-sub { font-size: 11px; color: #6b7a99; font-family: monospace; }
  .hdr-close {
    margin-left: auto; background: none; border: 1px solid #2a3145; color: #6b7a99;
    width: 30px; height: 30px; border-radius: 7px; cursor: pointer; font-size: 18px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: all .15s; line-height: 1;
  }
  .hdr-close:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,.1); }

  /* Body */
  .body { padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; }

  /* Date row */
  .date-row { display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: 8px; align-items: flex-end; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-size: 10px; font-weight: 600; color: #6b7a99; text-transform: uppercase; letter-spacing: .5px; font-family: monospace; }
  .field-input {
    background: #0a0c11; border: 1px solid #2a3145; border-radius: 7px;
    padding: 8px 11px; font-size: 13px; color: #e8ecf4; font-family: monospace;
    outline: none; width: 100%; transition: border-color .2s, box-shadow .2s;
  }
  .field-input:focus { border-color: #4f7dff; box-shadow: 0 0 0 2px rgba(79,125,255,.15); }
  .field-input[type=date]::-webkit-calendar-picker-indicator { filter: invert(.6); cursor: pointer; }

  /* Buttons */
  .btn {
    padding: 8px 14px; border-radius: 7px; font-size: 12px; font-weight: 600;
    cursor: pointer; border: none; outline: none;
    display: inline-flex; align-items: center; gap: 5px;
    white-space: nowrap; transition: all .18s; font-family: inherit;
  }
  .btn-p { background: #4f7dff; color: #fff; }
  .btn-p:hover:not(:disabled) { background: #6b8fff; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,125,255,.4); }
  .btn-s { background: #1e2330; color: #e8ecf4; border: 1px solid #2a3145; }
  .btn-s:hover:not(:disabled) { border-color: #4f7dff; color: #4f7dff; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn-sm { padding: 6px 11px; font-size: 11px; }

  /* Log */
  .log {
    background: #080a0e; border: 1px solid #2a3145; border-radius: 8px;
    padding: 12px; height: 110px; overflow-y: auto;
    font-family: monospace; font-size: 11px; line-height: 1.9; flex-shrink: 0;
  }
  .log-line { display: flex; gap: 8px; }
  .log-time { color: #4a5568; flex-shrink: 0; }
  .log-msg { color: #e8ecf4; }
  .log-msg.ok { color: #22c55e; }
  .log-msg.warn { color: #f59e0b; }
  .log-msg.err { color: #ef4444; }
  .log-msg.info { color: #00e5c8; }

  /* Table wrap */
  .table-wrap { flex: 1; overflow: auto; border: 1px solid #2a3145; border-radius: 8px; min-height: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th {
    background: #1a1f2e; padding: 9px 12px; text-align: left;
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    color: #6b7a99; font-family: monospace;
    border-bottom: 1px solid #2a3145; position: sticky; top: 0; white-space: nowrap;
  }
  tbody tr { border-bottom: 1px solid rgba(42,49,69,.4); transition: background .12s; }
  tbody tr:hover { background: rgba(79,125,255,.06); }
  tbody td { padding: 9px 12px; vertical-align: middle; color: #e8ecf4; }

  .tag { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-family: monospace; background: rgba(79,125,255,.15); color: #4f7dff; border: 1px solid rgba(79,125,255,.3); }
  .amt { font-family: monospace; font-weight: 700; color: #00e5c8; }
  .link { color: #4f7dff; font-family: monospace; font-size: 10px; text-decoration: none; }
  .link:hover { text-decoration: underline; }
  .cbtn {
    opacity: 0; padding: 2px 6px; font-size: 9px; border-radius: 4px;
    background: #1e2330; border: 1px solid #2a3145; color: #6b7a99;
    cursor: pointer; font-family: monospace; transition: all .15s; margin-left: 4px;
  }
  tbody tr:hover .cbtn { opacity: 1; }
  .cbtn:hover { background: #4f7dff; border-color: #4f7dff; color: #fff; }
  .cbtn.copied { background: #22c55e; border-color: #22c55e; color: #fff; opacity: 1; }
  .cbtn-row { opacity: 1 !important; }

  /* Empty */
  .empty { text-align: center; padding: 48px 16px; color: #6b7a99; font-size: 13px; }
  .empty-icon { font-size: 32px; margin-bottom: 10px; opacity: .4; }

  /* Summary bar */
  .sumbar {
    display: none; flex-wrap: wrap; gap: 14px; padding: 12px 18px;
    background: #161a23; border-top: 1px solid #2a3145;
    align-items: center; flex-shrink: 0;
  }
  .si label { font-size: 10px; color: #6b7a99; font-family: monospace; text-transform: uppercase; display: block; margin-bottom: 2px; }
  .si span { font-size: 17px; font-weight: 700; font-family: monospace; color: #00e5c8; }
  .sdiv { width: 1px; height: 30px; background: #2a3145; }
  .sum-actions { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }

  /* Toast */
  .toast {
    position: fixed; bottom: 20px; right: 20px;
    background: #22c55e; color: #fff; padding: 10px 16px;
    border-radius: 8px; font-size: 12px; font-weight: 600;
    transform: translateY(40px); opacity: 0;
    transition: all .3s cubic-bezier(.34,1.56,.64,1);
    pointer-events: none; z-index: 10;
  }
  .toast.show { transform: translateY(0); opacity: 1; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #0d0f14; }
  ::-webkit-scrollbar-thumb { background: #2a3145; border-radius: 3px; }
</style>

<div class="panel">
  <!-- Header -->
  <div class="hdr">
    <div class="hdr-logo">EP</div>
    <div class="hdr-info">
      <div class="hdr-title">비용문서 추출기</div>
      <div class="hdr-sub">작성문서함 · 브라우저 직접 연동</div>
    </div>
    <button class="hdr-close" id="closeBtn">✕</button>
  </div>

  <!-- Body -->
  <div class="body">
    <!-- 날짜 입력 -->
    <div class="date-row">
      <div class="field">
        <span class="field-label">시작일</span>
        <input type="date" class="field-input" id="epFrom" />
      </div>
      <div class="field">
        <span class="field-label">종료일</span>
        <input type="date" class="field-input" id="epTo" />
      </div>
      <button class="btn btn-p" id="searchBtn">🔍 조회</button>
      <button class="btn btn-s btn-sm" id="thisMonthBtn">이번달</button>
      <button class="btn btn-s btn-sm" id="lastMonthBtn">지난달</button>
    </div>

    <!-- 로그 -->
    <div class="log" id="epLog">
      <div class="log-line"><span class="log-time">00:00:00</span><span class="log-msg info">기간을 선택 후 조회 버튼을 클릭하세요.</span></div>
    </div>

    <!-- 테이블 -->
    <div class="table-wrap">
      <div class="empty" id="epEmpty"><div class="empty-icon">📂</div><div>조회 후 비용 문서가 여기에 표시됩니다</div></div>
      <table id="epTable" style="display:none">
        <thead>
          <tr><th>#</th><th>계정과목</th><th>금액</th><th>내역</th><th>URL</th><th></th></tr>
        </thead>
        <tbody id="epTbody"></tbody>
      </table>
    </div>

    <!-- 요약 -->
    <div class="sumbar" id="epSumbar">
      <div class="si"><label>문서 수</label><span id="sumDocs">0</span></div>
      <div class="sdiv"></div>
      <div class="si"><label>총 금액</label><span id="sumAmt">₩0</span></div>
      <div class="sdiv"></div>
      <div class="si"><label>계정과목 종류</label><span id="sumAccts">0</span></div>
      <div class="sum-actions">
        <button class="btn btn-s btn-sm" id="copyTsvBtn">📋 전체 복사 (구글시트용)</button>
        <button class="btn btn-p btn-sm" id="downloadCsvBtn">⬇ CSV</button>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="epToast"></div>
`;

  // ── Shadow DOM 내부 요소 참조 ────────────────────────
  const $ = (id) => shadow.getElementById(id);

  // ── 날짜 유틸 ────────────────────────────────────────
  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function setThisMonth() {
    const n = new Date();
    const firstDay = new Date(n.getFullYear(), n.getMonth(), 1);
    const lastDay  = new Date(n.getFullYear(), n.getMonth() + 1, 0);
    const toDay    = n.getDate() < lastDay.getDate() ? n : lastDay;
    $('epFrom').value = fmtDate(firstDay);
    $('epTo').value   = fmtDate(toDay);
  }

  function setLastMonth() {
    const n = new Date();
    const firstDay = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    const lastDay  = new Date(n.getFullYear(), n.getMonth(), 0);
    $('epFrom').value = fmtDate(firstDay);
    $('epTo').value   = fmtDate(lastDay);
  }

  // ── 초기값: 이번달 ───────────────────────────────────
  setThisMonth();

  // ── 로그 ─────────────────────────────────────────────
  function log(msg, type = '') {
    const box = $('epLog');
    const line = document.createElement('div');
    line.className = 'log-line';
    const t = new Date().toTimeString().slice(0, 8);
    line.innerHTML = `<span class="log-time">${t}</span><span class="log-msg ${type}">${msg}</span>`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function showToast(msg) {
    const t = $('epToast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ── 파싱 ─────────────────────────────────────────────
  function parseList(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const docs = [];
    doc.querySelectorAll('table tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td')];
      if (cells.length < 4) return;
      const type = cells[1]?.textContent.trim();
      if (!COST_TYPES.includes(type)) return;
      const link = tr.querySelector('a');
      docs.push({ type, title: cells[2]?.textContent.trim(), url: link?.href || '' });
    });
    return docs;
  }

  function parseDetail(html, url, docType) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = [...doc.querySelectorAll('tr')];

    // 내역: 제목 셀
    let description = '';
    for (const row of rows) {
      const cells = [...row.querySelectorAll('th,td')];
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].textContent.trim() === '제목' && cells[i + 1]) {
          description = cells[i + 1].textContent.trim(); break;
        }
      }
      if (description) break;
    }

    let account = '', amount = 0;

    if (docType === '직원차량운행표') {
      account = '자가차량운행';
      for (const row of rows) {
        const cells = [...row.querySelectorAll('th,td')];
        for (let i = 0; i < cells.length; i++) {
          const label = cells[i].textContent.trim();
          if (label === '운행목적' && cells[i+1]) description = cells[i+1].textContent.trim();
          if (label === '청구 합계' && cells[i+1]) {
            const m = cells[i+1].textContent.trim().match(/^([\d,]+)\s*원/);
            if (m) amount = parseInt(m[1].replace(/,/g, '')) || 0;
          }
        }
      }
    } else if (docType.startsWith('매출외출고요청서')) {
      account = '미수금(매출외)';
      for (const tbl of doc.querySelectorAll('table')) {
        const headerRow = tbl.querySelector('tr');
        if (!headerRow) continue;
        const headers = [...headerRow.querySelectorAll('th,td')].map(c => c.textContent.trim().replace(/\s+/g, ''));
        const amtIdx = headers.indexOf('금액');
        if (amtIdx < 0) continue;
        const kaeRow = [...tbl.querySelectorAll('tr')].find(r => [...r.querySelectorAll('td')][0]?.textContent.trim() === '계');
        if (!kaeRow) continue;
        const raw = [...kaeRow.querySelectorAll('td')][amtIdx]?.textContent.trim().replace(/,/g, '');
        if (raw && /^\d+$/.test(raw)) { amount = parseInt(raw) || 0; break; }
      }
    } else {
      // EA전표 / 소액전표 / 대체전표
      for (const tbl of doc.querySelectorAll('table')) {
        const headers = [...tbl.querySelectorAll('th')].map(th => th.textContent.trim());
        if (!headers.includes('계정과목')) continue;
        const acctIdx = headers.indexOf('계정과목');
        const debitIdx = headers.indexOf('차변');
        if (acctIdx < 0 || debitIdx < 0) continue;
        for (const row of tbl.querySelectorAll('tbody tr')) {
          const cells = [...row.querySelectorAll('td')];
          if (cells.length <= Math.max(acctIdx, debitIdx)) continue;
          const acctText = cells[acctIdx]?.textContent.split('\n')[0].trim();
          if (!acctText) continue;
          if (COST_ACCOUNTS.find(a => acctText.includes(a))) {
            if (!account) account = acctText;
            const raw = cells[debitIdx]?.textContent.replace(/,/g, '').replace(/-/g, '').trim();
            amount += parseInt(raw) || 0;
          }
        }
        break;
      }
    }

    return { account, amount: String(amount), description, url };
  }

  // ── 조회 ─────────────────────────────────────────────
  let extractedData = [];

  async function doSearch() {
    const from = $('epFrom').value;
    const to   = $('epTo').value;
    if (!from || !to) { log('기간을 선택하세요.', 'err'); return; }
    if (from > to) { log('시작일이 종료일보다 늦습니다.', 'err'); return; }

    const btn = $('searchBtn');
    btn.disabled = true; btn.textContent = '조회 중...';
    log(`조회 기간: ${from} ~ ${to}`, 'info');
    log('작성문서함 접속 중...', '');

    try {
      const listRes = await fetch(
        `/WebFlow/list_MyWrite.do?frDt=${from}&toDt=${to}&deptCd=&_type=&_code=&_subj=&_name=`,
        { credentials: 'include' }
      );
      if (!listRes.ok) throw new Error('HTTP ' + listRes.status);
      const listHtml = await listRes.text();

      if (listHtml.includes('j_username') || listHtml.includes('/account/login')) {
        log('EP 로그인이 필요합니다. 로그인 후 다시 시도하세요.', 'err');
        return;
      }

      const costDocs = parseList(listHtml);
      log(`비용 문서 ${costDocs.length}건 발견`, 'ok');

      if (!costDocs.length) {
        log('해당 기간에 비용 문서가 없습니다.', 'warn');
        renderTable([]);
        return;
      }

      log(`상세 정보 추출 중 (${costDocs.length}건)...`, '');
      const results = [];
      for (let i = 0; i < costDocs.length; i++) {
        const doc = costDocs[i];
        try {
          const dRes = await fetch(doc.url, { credentials: 'include' });
          const dHtml = await dRes.text();
          const detail = parseDetail(dHtml, doc.url, doc.type);
          results.push({
            account: detail.account || doc.type,
            amount: detail.amount,
            description: detail.description || doc.title,
            url: doc.url,
          });
          log(`[${i+1}/${costDocs.length}] ${detail.description || doc.title}`, 'ok');
        } catch(e) {
          results.push({ account: '', amount: '0', description: doc.title, url: doc.url });
          log(`[${i+1}/${costDocs.length}] 상세 실패: ${doc.title}`, 'warn');
        }
      }

      log(`✓ 추출 완료 ${results.length}건`, 'ok');
      renderTable(results);

    } catch(e) {
      log('오류: ' + e.message, 'err');
    } finally {
      btn.disabled = false; btn.textContent = '🔍 조회';
    }
  }

  // ── 렌더링 ───────────────────────────────────────────
  function fmtAmt(v) {
    const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? v : '₩' + n.toLocaleString('ko-KR');
  }

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderTable(data) {
    extractedData = data;
    const tbody  = $('epTbody');
    const table  = $('epTable');
    const empty  = $('epEmpty');
    const sumbar = $('epSumbar');

    if (!data.length) {
      table.style.display = 'none'; empty.style.display = 'block'; sumbar.style.display = 'none'; return;
    }
    empty.style.display = 'none'; table.style.display = 'table';

    tbody.innerHTML = data.map((r, i) => `
      <tr>
        <td style="color:#4a5568;font-family:monospace;text-align:center">${i+1}</td>
        <td><span class="tag">${esc(r.account||'?')}</span></td>
        <td><span class="amt">${fmtAmt(r.amount)}</span><button class="cbtn" data-val="${esc(r.amount)}">복사</button></td>
        <td>${esc(r.description)}<button class="cbtn" data-val="${esc(r.description)}">복사</button></td>
        <td>${r.url ? `<a class="link" href="${esc(r.url)}" target="_blank">열기↗</a>` : '-'}<button class="cbtn" data-val="${esc(r.url)}">복사</button></td>
        <td><button class="cbtn cbtn-row" data-row="${i}">행복사</button></td>
      </tr>`).join('');

    // 이벤트 위임
    tbody.onclick = async (e) => {
      const btn = e.target.closest('.cbtn');
      if (!btn) return;
      if (btn.dataset.row !== undefined) {
        const r = data[parseInt(btn.dataset.row)];
        await navigator.clipboard.writeText([r.account, r.amount, r.description, r.url||''].join('\t'));
        showToast('행 복사 완료');
      } else if (btn.dataset.val !== undefined) {
        await navigator.clipboard.writeText(btn.dataset.val);
        btn.textContent = '✓'; btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('copied'); }, 1400);
      }
    };

    const total = data.reduce((s, r) => s + (parseInt(r.amount)||0), 0);
    $('sumDocs').textContent = data.length;
    $('sumAmt').textContent  = '₩' + total.toLocaleString('ko-KR');
    $('sumAccts').textContent = new Set(data.map(r => r.account)).size;
    sumbar.style.display = 'flex';
  }

  // ── 복사 / 다운로드 ──────────────────────────────────
  $('copyTsvBtn').onclick = async () => {
    const rows = extractedData.map(r => [r.account, r.amount, r.description, r.url||''].join('\t'));
    await navigator.clipboard.writeText(rows.join('\n'));
    showToast('✅ 전체 복사 완료! 구글시트에 Ctrl+V 하세요');
  };

  $('downloadCsvBtn').onclick = () => {
    const h = '계정과목,금액,내역,URL';
    const rows = extractedData.map(r =>
      [r.account, r.amount, r.description, r.url||''].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
    );
    const csv = '\uFEFF' + [h, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `EP_비용문서_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast('⬇ CSV 다운로드 시작');
  };

  // ── 이벤트 연결 ──────────────────────────────────────
  $('closeBtn').onclick    = () => host.remove();
  $('searchBtn').onclick   = doSearch;
  $('thisMonthBtn').onclick = setThisMonth;
  $('lastMonthBtn').onclick = setLastMonth;
  shadow.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

})();
