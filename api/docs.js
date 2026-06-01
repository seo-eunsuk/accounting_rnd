// api/docs.js — EP 작성문서함 조회 + 비용문서 상세 추출 프록시

const https = require('https');
const { URL } = require('url');

const EP_BASE = 'https://ep.fursys.com';

// 비용 문서 구분 (5가지)
const COST_DOC_TYPES = ['EA전표', '소액전표', '직원차량운행표', '대체전표', '매출외출고요청서(신)', '매출외출고요청서'];

// 계정과목 리스트
const COST_ACCOUNTS = [
  '(판)접대비','(판)광고선전비','미수금(매출외)','(판)복리후생비','자가차량운행',
  '(판)지급수수료','(판)교육훈련비','(판)경상연구개발비','(판)통신비',
  '(판)하자보수비','(판)비품비','(판)소모품비','(판)물류비','(판)여비교통비'
];

function makeRequest(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        location: res.headers['location'] || null,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ── HTML 파싱 헬퍼 ──────────────────────────────
function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// 작성문서함 목록 HTML → 문서 배열
function parseDocList(html) {
  const docs = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let t;
    while ((t = tdRe.exec(m[1])) !== null) {
      const hrefM = t[1].match(/href=["']([^"']+)["']/i);
      cells.push({ text: stripTags(t[1]), href: hrefM ? hrefM[1] : '' });
    }
    if (cells.length < 4) continue;
    // 헤더행 스킵
    if (cells[0].text === '문서번호' || cells[0].text === '') continue;

    const docType = cells[1]?.text || '';
    if (!COST_DOC_TYPES.includes(docType)) continue;

    const href = cells.find(c => c.href && c.href.includes('view.do'))?.href || '';
    docs.push({
      docNo: cells[0].text,
      type: docType,
      title: cells[2]?.text || '',
      date: cells[3]?.text || '',
      viewUrl: href.startsWith('http') ? href : EP_BASE + href,
    });
  }
  return docs;
}

// 문서 상세 HTML → 계정과목·금액·내역 추출
function parseDocDetail(html, viewUrl) {
  // 1) 내역 (제목 셀 다음)
  let description = '';
  const descM = html.match(/<th[^>]*>\s*제목\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (descM) description = stripTags(descM[1]);

  // 2) 계정과목 테이블 파싱
  // 컬럼: 계정과목 | 적요 | 코스트센터 | 차변 | 대변
  let account = '';
  let amount = 0;

  // 계정과목 헤더가 있는 테이블 찾기
  const tblRe = /<table[\s\S]*?<\/table>/gi;
  let tblM;
  while ((tblM = tblRe.exec(html)) !== null) {
    const tblHtml = tblM[0];
    if (!tblHtml.includes('계정과목')) continue;

    // 헤더 순서 파악
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    const headers = [];
    let h;
    while ((h = thRe.exec(tblHtml)) !== null) headers.push(stripTags(h[1]));

    const acctIdx = headers.indexOf('계정과목');
    const debitIdx = headers.indexOf('차변');
    if (acctIdx < 0 || debitIdx < 0) continue;

    // tbody 행 파싱
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let row;
    while ((row = rowRe.exec(tblHtml)) !== null) {
      const tdRe2 = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [];
      let td;
      while ((td = tdRe2.exec(row[1])) !== null) cells.push(stripTags(td[1]));
      if (cells.length <= Math.max(acctIdx, debitIdx)) continue;

      const acctText = cells[acctIdx]?.split('\n')[0].trim();
      if (!acctText) continue;

      // 계정과목 리스트 매칭
      const matched = COST_ACCOUNTS.find(a => acctText.includes(a));
      if (matched) {
        if (!account) account = acctText; // 첫 번째 매칭 계정과목 사용
        const debitRaw = cells[debitIdx]?.replace(/,/g, '').replace(/-/g, '').trim();
        amount += parseInt(debitRaw) || 0;
      }
    }
    break;
  }

  // 직원차량운행표: 계정과목/차변 테이블 없음 → 별도 파싱
  // 계정과목=자가차량운행, 금액=청구 합계, 내역=운행목적
  if (!account) {
    const amtM = html.match(/청구\s*합계[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    if (amtM) {
      const amtText = stripTags(amtM[1]);
      const numM = amtText.match(/^([\d,]+)\s*원/);
      if (numM) {
        account = '자가차량운행';
        amount = parseInt(numM[1].replace(/,/g, '')) || 0;
      }
    }
    const purposeM = html.match(/운행목적[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    if (purposeM) description = stripTags(purposeM[1]);
  }

  // 매출외출고요청서: 계정과목=미수금(매출외), 금액=헤더의 '금액' 컬럼 인덱스로 '계' 행에서 추출
  if (!account) {
    // 1) '제품명'과 '금액' 헤더가 함께 있는 테이블 찾기
    const tblRe2 = /<table[\s\S]*?<\/table>/gi;
    let tblM2;
    while ((tblM2 = tblRe2.exec(html)) !== null) {
      const tblHtml = tblM2[0];
      if (!tblHtml.includes('제') || !tblHtml.includes('금액')) continue;

      // 헤더 행에서 컬럼 순서 파악 (공백 제거 후 비교)
      const headerRowM = tblHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
      if (!headerRowM) continue;
      const thRe2 = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      const headers = [];
      let hm;
      while ((hm = thRe2.exec(headerRowM[1])) !== null)
        headers.push(stripTags(hm[1]).replace(/\s+/g, ''));

      const amtIdx = headers.indexOf('금액');
      if (amtIdx < 0) continue;

      // 2) '계' 행에서 amtIdx 위치 셀 추출
      const rowRe2 = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowM2;
      while ((rowM2 = rowRe2.exec(tblHtml)) !== null) {
        const tdRe2 = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const cells = [];
        let tm;
        while ((tm = tdRe2.exec(rowM2[1])) !== null) cells.push(stripTags(tm[1]));
        if (cells[0]?.trim() !== '계') continue;
        const amtRaw = cells[amtIdx]?.replace(/,/g, '').trim();
        if (amtRaw && /^\d+$/.test(amtRaw)) {
          account = '미수금(매출외)';
          amount = parseInt(amtRaw) || 0;
        }
        break;
      }
      if (account) break;
    }
  }

  return { account, amount, description, url: viewUrl };
}

// ── 핸들러 ──────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionCookie, dateFrom, dateTo } = req.body;
  if (!sessionCookie || !dateFrom || !dateTo)
    return res.status(400).json({ error: '필수 파라미터 없음' });

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Cookie': sessionCookie,
    'Accept': 'text/html,*/*',
    'Accept-Language': 'ko-KR,ko;q=0.9',
  };

  try {
    // 1) 작성문서함 GET 조회
    const listRes = await makeRequest(
      `${EP_BASE}/WebFlow/list_MyWrite.do?frDt=${dateFrom}&toDt=${dateTo}&deptCd=&_type=&_code=&_subj=&_name=`,
      { headers }
    );

    if (listRes.status === 302 && listRes.location?.includes('login'))
      return res.status(401).json({ error: '세션 만료. 다시 로그인하세요.' });

    // 2) 비용 문서 필터링 (4가지 문서구분)
    const costDocs = parseDocList(listRes.body);

    // 3) 각 문서 상세 접근 → 4가지 정보 추출
    const results = [];
    for (const doc of costDocs) {
      try {
        const detailRes = await makeRequest(doc.viewUrl, { headers });
        const detail = parseDocDetail(detailRes.body, doc.viewUrl);
        results.push({
          account: detail.account || doc.type,
          amount: String(detail.amount),
          description: detail.description || doc.title,
          url: doc.viewUrl,
        });
      } catch (e) {
        // 상세 실패 시 목록 정보로 fallback
        results.push({
          account: '',
          amount: '0',
          description: doc.title,
          url: doc.viewUrl,
        });
      }
    }

    return res.status(200).json({
      success: true,
      total: results.length,
      costDocs: results,
      _debug: {
        listStatus: listRes.status,
        listLen: listRes.body.length,
        listPreview: listRes.body.slice(0, 600),
        listHasTable: listRes.body.includes('<table'),
        costDocsParsed: costDocs.length,
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
