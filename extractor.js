(function() {
  // 이미 실행 중이면 토글
  const existing = document.getElementById('_ep_extractor_panel');
  if (existing) { existing.remove(); return; }

  const COST_TYPES = ['EA전표','소액전표','직원차량운행표','대체전표','매출외출고요청서(신)','매출외출고요청서'];
  const COST_ACCOUNTS = ['(판)접대비','(판)광고선전비','미수금(매출외)','(판)복리후생비','자가차량운행','(판)지급수수료','(판)교육훈련비','(판)경상연구개발비','(판)통신비','(판)하자보수비','(판)비품비','(판)소모품비','(판)물류비','(판)여비교통비'];

  // ── 패널 HTML 삽입 ──────────────────────────────────
  const panel = document.createElement('div');
  panel.id = '_ep_extractor_panel';
  panel.innerHTML = `
<style>
#_ep_extractor_panel {
  position:fixed;top:0;right:0;width:780px;height:100vh;
  background:#0d0f14;border-left:2px solid #2a3145;
  font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;
  z-index:999999;display:flex;flex-direction:column;
  box-shadow:-8px 0 32px rgba(0,0,0,.6);
  color:#e8ecf4;font-size:13px;
}
#_ep_hdr {
  display:flex;align-items:center;gap:10px;padding:14px 18px;
  background:#161a23;border-bottom:1px solid #2a3145;flex-shrink:0;
}
#_ep_hdr .logo {
  background:linear-gradient(135deg,#4f7dff,#00e5c8);
  width:30px;height:30px;border-radius:7px;display:flex;align-items:center;
  justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0;
}
#_ep_hdr .title {font-size:15px;font-weight:700;}
#_ep_hdr .sub {font-size:11px;color:#6b7a99;font-family:monospace;}
#_ep_close {
  margin-left:auto;background:none;border:1px solid #2a3145;color:#6b7a99;
  width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:16px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
#_ep_close:hover{border-color:#ef4444;color:#ef4444;}
#_ep_body {padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;flex:1;}
._ep_row {display:grid;grid-template-columns:1fr 1fr auto auto auto;gap:8px;align-items:flex-end;}
._ep_field {display:flex;flex-direction:column;gap:4px;}
._ep_label {font-size:10px;font-weight:600;color:#6b7a99;text-transform:uppercase;letter-spacing:.5px;font-family:monospace;}
._ep_input {
  background:#0d0f14;border:1px solid #2a3145;border-radius:7px;
  padding:8px 11px;font-size:13px;color:#e8ecf4;font-family:monospace;
  outline:none;width:100%;transition:border-color .2s;
}
._ep_input:focus{border-color:#4f7dff;box-shadow:0 0 0 2px rgba(79,125,255,.15);}
._ep_input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.6);cursor:pointer;}
._ep_btn {
  padding:8px 16px;border-radius:7px;font-size:12px;font-weight:600;
  cursor:pointer;border:none;display:inline-flex;align-items:center;gap:5px;
  white-space:nowrap;font-family:inherit;transition:all .18s;
}
._ep_btn_p{background:#4f7dff;color:#fff;}
._ep_btn_p:hover:not(:disabled){background:#6b8fff;transform:translateY(-1px);}
._ep_btn_s{background:#1e2330;color:#e8ecf4;border:1px solid #2a3145;}
._ep_btn_s:hover:not(:disabled){border-color:#4f7dff;color:#4f7dff;}
._ep_btn:disabled{opacity:.4;cursor:not-allowed;}
#_ep_log {
  background:#0d0f14;border:1px solid #2a3145;border-radius:8px;
  padding:12px;height:110px;overflow-y:auto;font-family:monospace;font-size:11px;line-height:1.8;flex-shrink:0;
}
._ep_ll{display:flex;gap:8px;}
._ep_lt{color:#6b7a99;flex-shrink:0;}
._ep_lm{color:#e8ecf4;}
._ep_lm.ok{color:#22c55e;} ._ep_lm.warn{color:#f59e0b;} ._ep_lm.err{color:#ef4444;} ._ep_lm.info{color:#00e5c8;}
#_ep_table_wrap {overflow:auto;flex:1;border:1px solid #2a3145;border-radius:8px;}
#_ep_table_wrap table{width:100%;border-collapse:collapse;font-size:12px;}
#_ep_table_wrap thead th {
  background:#1e2330;padding:9px 12px;text-align:left;font-size:10px;
  font-weight:600;text-transform:uppercase;color:#6b7a99;font-family:monospace;
  border-bottom:1px solid #2a3145;position:sticky;top:0;white-space:nowrap;
}
#_ep_table_wrap tbody tr{border-bottom:1px solid rgba(42,49,69,.4);}
#_ep_table_wrap tbody tr:hover{background:rgba(79,125,255,.05);}
#_ep_table_wrap tbody td{padding:9px 12px;vertical-align:middle;}
._ep_tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-family:monospace;background:rgba(79,125,255,.15);color:#4f7dff;border:1px solid rgba(79,125,255,.3);}
._ep_amt{font-family:monospace;font-weight:700;color:#00e5c8;}
._ep_link{color:#4f7dff;font-family:monospace;font-size:10px;text-decoration:none;}
._ep_link:hover{text-decoration:underline;}
._ep_cbtn{opacity:0;padding:2px 6px;font-size:9px;border-radius:4px;background:#1e2330;border:1px solid #2a3145;color:#6b7a99;cursor:pointer;font-family:monospace;transition:all .15s;margin-left:4px;}
#_ep_table_wrap tbody tr:hover ._ep_cbtn{opacity:1;}
._ep_cbtn:hover{background:#4f7dff;border-color:#4f7dff;color:#fff;}
._ep_cbtn.ok{background:#22c55e;border-color:#22c55e;color:#fff;opacity:1;}
._ep_cbtn_row{opacity:1!important;}
#_ep_sumbar{
  display:none;flex-wrap:wrap;gap:14px;padding:12px 16px;
  background:#161a23;border-top:1px solid #2a3145;align-items:center;flex-shrink:0;
}
._ep_si label{font-size:10px;color:#6b7a99;font-family:monospace;text-transform:uppercase;display:block;}
._ep_si span{font-size:16px;font-weight:700;font-family:monospace;color:#00e5c8;}
#_ep_sumbar .actions{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;}
#_ep_empty{text-align:center;padding:40px 16px;color:#6b7a99;}
._ep_toast{position:fixed;bottom:20px;right:20px;background:#22c55e;color:#fff;padding:10px 16px;border-radius:8px;font-size:12px;font-weight:600;transform:translateY(40px);opacity:0;transition:all .3s cubic-bezier(.34,1.56,.64,1);z-index:9999999;pointer-events:none;}
._ep_toast.show{transform:translateY(0);opacity:1;}
</style>
<div id="_ep_hdr">
  <div class="logo">EP</div>
  <div><div class="title">비용문서 추출기</div><div class="sub">작성문서함 · 브라우저 직접 연동</div></div>
  <button id="_ep_close" onclick="document.getElementById('_ep_extractor_panel').remove()">✕</button>
</div>
<div id="_ep_body">
  <div class="_ep_row">
    <div class="_ep_field"><label class="_ep_label">시작일</label><input type="date" id="_ep_from" class="_ep_input"/></div>
    <div class="_ep_field"><label class="_ep_label">종료일</label><input type="date" id="_ep_to" class="_ep_input"/></div>
    <button class="_ep_btn _ep_btn_p" id="_ep_search_btn" onclick="_epSearch()">🔍 조회</button>
    <button class="_ep_btn _ep_btn_s" onclick="_epThisMonth()">이번달</button>
    <button class="_ep_btn _ep_btn_s" onclick="_epLastMonth()">지난달</button>
  </div>
  <div id="_ep_log"><div class="_ep_ll"><span class="_ep_lt">00:00:00</span><span class="_ep_lm info">기간을 선택 후 조회 버튼을 클릭하세요.</span></div></div>
  <div id="_ep_table_wrap">
    <div id="_ep_empty"><div style="font-size:28px;margin-bottom:8px;opacity:.4">📂</div><div>조회 후 비용 문서가 여기에 표시됩니다</div></div>
    <table id="_ep_table" style="display:none">
      <thead><tr><th>#</th><th>계정과목</th><th>금액</th><th>내역</th><th>URL</th><th></th></tr></thead>
      <tbody id="_ep_tbody"></tbody>
    </table>
  </div>
  <div id="_ep_sumbar">
    <div class="_ep_si"><label>문서 수</label><span id="_ep_sum_docs">0</span></div>
    <div style="width:1px;height:28px;background:#2a3145"></div>
    <div class="_ep_si"><label>총 금액</label><span id="_ep_sum_amt">₩0</span></div>
    <div style="width:1px;height:28px;background:#2a3145"></div>
    <div class="_ep_si"><label>계정과목 종류</label><span id="_ep_sum_accts">0</span></div>
    <div class="actions">
      <button class="_ep_btn _ep_btn_s" onclick="_epCopyTSV()" style="font-size:11px;padding:6px 12px;">📋 전체 복사 (구글시트용)</button>
      <button class="_ep_btn _ep_btn_p" onclick="_epDownloadCSV()" style="font-size:11px;padding:6px 12px;">⬇ CSV</button>
    </div>
  </div>
</div>
<div class="_ep_toast" id="_ep_toast"></div>
`;
  document.body.appendChild(panel);

  // ── 초기화 ──────────────────────────────────────────
  const now = new Date();
  const _initLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const _initToDay = now.getDate() < _initLastDay.getDate() ? now : _initLastDay;
  document.getElementById('_ep_from').value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  document.getElementById('_ep_to').value   = _initToDay.toISOString().slice(0,10);

  let _epData = [];

  // ── 유틸 ────────────────────────────────────────────
  window._epLog = function(msg, type='') {
    const b = document.getElementById('_ep_log');
    const d = document.createElement('div'); d.className = '_ep_ll';
    const t = new Date().toTimeString().slice(0,8);
    d.innerHTML = `<span class="_ep_lt">${t}</span><span class="_ep_lm ${type}">${msg}</span>`;
    b.appendChild(d); b.scrollTop = b.scrollHeight;
  };

  window._epToast = function(msg) {
    const t = document.getElementById('_ep_toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  };

  window._epThisMonth = function() {
    const n = new Date();
    const firstDay = new Date(n.getFullYear(), n.getMonth(), 1);
    const lastDay  = new Date(n.getFullYear(), n.getMonth() + 1, 0); // 이번달 말일
    // 오늘이 말일 전이면 오늘까지, 말일이면 말일까지
    const toDay = n.getDate() < lastDay.getDate() ? n : lastDay;
    document.getElementById('_ep_from').value = firstDay.toISOString().slice(0,10);
    document.getElementById('_ep_to').value   = toDay.toISOString().slice(0,10);
  };

  window._epLastMonth = function() {
    const n = new Date();
    const firstDay = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    const lastDay  = new Date(n.getFullYear(), n.getMonth(), 0); // 지난달 말일 (항상 말일까지)
    document.getElementById('_ep_from').value = firstDay.toISOString().slice(0,10);
    document.getElementById('_ep_to').value   = lastDay.toISOString().slice(0,10);
  };

  window._epFmt = function(v) {
    const n = parseInt(String(v).replace(/[^0-9]/g,''), 10);
    return isNaN(n) ? v : '₩' + n.toLocaleString('ko-KR');
  };

  window._epEsc = function(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  };

  // ── 파싱 ────────────────────────────────────────────
  window._epParseList = function(html) {
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
  };

  window._epParseDetail = function(html, url, docType) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = [...doc.querySelectorAll('tr')];

    // 내역: 제목 셀
    let description = '';
    for (const row of rows) {
      const cells = [...row.querySelectorAll('th,td')];
      for (let i=0; i<cells.length; i++) {
        if (cells[i].textContent.trim() === '제목' && cells[i+1]) {
          description = cells[i+1].textContent.trim(); break;
        }
      }
      if (description) break;
    }

    let account = '', amount = 0;

    if (docType === '직원차량운행표') {
      account = '자가차량운행';
      for (const row of rows) {
        const cells = [...row.querySelectorAll('th,td')];
        for (let i=0; i<cells.length; i++) {
          const label = cells[i].textContent.trim();
          if (label === '운행목적' && cells[i+1]) description = cells[i+1].textContent.trim();
          if (label === '청구 합계' && cells[i+1]) {
            const m = cells[i+1].textContent.trim().match(/^([\d,]+)\s*원/);
            if (m) amount = parseInt(m[1].replace(/,/g,'')) || 0;
          }
        }
      }
    } else if (docType.startsWith('매출외출고요청서')) {
      account = '미수금(매출외)';
      for (const tbl of doc.querySelectorAll('table')) {
        const headerRow = tbl.querySelector('tr');
        if (!headerRow) continue;
        const headers = [...headerRow.querySelectorAll('th,td')].map(c => c.textContent.trim().replace(/\s+/g,''));
        const amtIdx = headers.indexOf('금액');
        if (amtIdx < 0) continue;
        const kaeRow = [...tbl.querySelectorAll('tr')].find(r => [...r.querySelectorAll('td')][0]?.textContent.trim() === '계');
        if (!kaeRow) continue;
        const raw = [...kaeRow.querySelectorAll('td')][amtIdx]?.textContent.trim().replace(/,/g,'');
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
            const raw = cells[debitIdx]?.textContent.replace(/,/g,'').replace(/-/g,'').trim();
            amount += parseInt(raw) || 0;
          }
        }
        break;
      }
    }

    return { account, amount: String(amount), description, url };
  };

  // ── 조회 ────────────────────────────────────────────
  window._epSearch = async function() {
    const from = document.getElementById('_ep_from').value;
    const to = document.getElementById('_ep_to').value;
    if (!from || !to) { _epLog('기간을 선택하세요.','err'); return; }

    const btn = document.getElementById('_ep_search_btn');
    btn.disabled = true; btn.textContent = '조회 중...';

    _epLog(`조회 기간: ${from} ~ ${to}`, 'info');
    _epLog('작성문서함 접속 중...', '');

    try {
      const listRes = await fetch(
        `/WebFlow/list_MyWrite.do?frDt=${from}&toDt=${to}&deptCd=&_type=&_code=&_subj=&_name=`,
        { credentials: 'include' }
      );
      if (!listRes.ok) throw new Error('HTTP ' + listRes.status);
      const listHtml = await listRes.text();

      const costDocs = _epParseList(listHtml);
      _epLog(`비용 문서 ${costDocs.length}건 발견`, 'ok');

      if (!costDocs.length) {
        _epLog('해당 기간에 비용 문서가 없습니다.', 'warn');
        _epRender([]);
        return;
      }

      _epLog(`상세 정보 추출 중 (${costDocs.length}건)...`, '');
      const results = [];
      for (let i=0; i<costDocs.length; i++) {
        const doc = costDocs[i];
        try {
          const dRes = await fetch(doc.url, { credentials: 'include' });
          const dHtml = await dRes.text();
          const detail = _epParseDetail(dHtml, doc.url, doc.type);
          results.push({ account: detail.account||doc.type, amount: detail.amount, description: detail.description||doc.title, url: doc.url });
          _epLog(`[${i+1}/${costDocs.length}] ${detail.description||doc.title}`, 'ok');
        } catch(e) {
          results.push({ account:'', amount:'0', description: doc.title, url: doc.url });
          _epLog(`[${i+1}/${costDocs.length}] 상세 실패: ${doc.title}`, 'warn');
        }
      }

      _epLog(`✓ 추출 완료 ${results.length}건`, 'ok');
      _epRender(results);

    } catch(e) {
      _epLog('오류: ' + e.message, 'err');
    } finally {
      btn.disabled = false; btn.textContent = '🔍 조회';
    }
  };

  // ── 렌더링 ──────────────────────────────────────────
  window._epRender = function(data) {
    _epData = data;
    const tbody = document.getElementById('_ep_tbody');
    const tbl = document.getElementById('_ep_table');
    const empty = document.getElementById('_ep_empty');
    const sumbar = document.getElementById('_ep_sumbar');

    if (!data.length) {
      tbl.style.display = 'none'; empty.style.display = 'block'; sumbar.style.display = 'none'; return;
    }
    empty.style.display = 'none'; tbl.style.display = 'table';

    tbody.innerHTML = data.map((r,i) => `
      <tr>
        <td style="color:#6b7a99;font-family:monospace;font-size:11px;text-align:center">${i+1}</td>
        <td><span class="_ep_tag">${_epEsc(r.account||'?')}</span></td>
        <td><span class="_ep_amt">${_epFmt(r.amount)}</span><button class="_ep_cbtn" onclick="_epCpCell('${r.amount.replace(/'/g,"\\'")}',this)">복사</button></td>
        <td>${_epEsc(r.description)}<button class="_ep_cbtn" onclick="_epCpCell('${r.description.replace(/'/g,"\\'")}',this)">복사</button></td>
        <td>${r.url?`<a class="_ep_link" href="${_epEsc(r.url)}" target="_blank">열기↗</a>`:'-'}<button class="_ep_cbtn" onclick="_epCpCell('${r.url}',this)">복사</button></td>
        <td><button class="_ep_cbtn _ep_cbtn_row" onclick="_epCpRow(${i})">행복사</button></td>
      </tr>`).join('');

    const total = data.reduce((s,r) => s+(parseInt(r.amount)||0), 0);
    document.getElementById('_ep_sum_docs').textContent = data.length;
    document.getElementById('_ep_sum_amt').textContent = '₩' + total.toLocaleString('ko-KR');
    document.getElementById('_ep_sum_accts').textContent = new Set(data.map(r=>r.account)).size;
    sumbar.style.display = 'flex';
  };

  window._epCpCell = async function(v, btn) {
    await navigator.clipboard.writeText(v);
    btn.textContent='✓'; btn.classList.add('ok');
    setTimeout(()=>{ btn.textContent='복사'; btn.classList.remove('ok'); }, 1400);
  };

  window._epCpRow = function(i) {
    const r = _epData[i];
    navigator.clipboard.writeText([r.account,r.amount,r.description,r.url||''].join('\t'));
    _epToast('행 복사 완료');
  };

  window._epCopyTSV = function() {
    const rows = _epData.map(r=>[r.account,r.amount,r.description,r.url||''].join('\t'));
    navigator.clipboard.writeText(rows.join('\n'));
    _epToast('✅ 전체 복사 완료! 구글시트에 Ctrl+V 하세요');
  };

  window._epDownloadCSV = function() {
    const h='계정과목,금액,내역,URL';
    const rows=_epData.map(r=>[r.account,r.amount,r.description,r.url||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
    const csv='\uFEFF'+[h,...rows].join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    a.download=`EP_비용문서_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    _epToast('⬇ CSV 다운로드 시작');
  };

})();
