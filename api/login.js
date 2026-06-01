// api/login.js — EP 로그인 프록시 (리다이렉트 완전 추적)
const https = require('https');
const { URL } = require('url');

const EP_BASE = 'https://ep.fursys.com';

function makeRequest(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
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
        headers: res.headers,
        cookies: res.headers['set-cookie'] || [],
        location: res.headers['location'] || null,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// 쿠키 배열 → 딕셔너리 병합
function mergeCookies(existing, newCookies) {
  const map = {};
  // 기존 쿠키 파싱
  existing.split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) map[k.trim()] = v || '';
  });
  // 새 쿠키 추가/덮어쓰기
  newCookies.forEach(c => {
    const part = c.split(';')[0].trim();
    const [k, v] = part.split('=');
    if (k) map[k.trim()] = v || '';
  });
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '아이디/비밀번호 필요' });

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    // Step 1: 로그인 페이지 GET → 초기 세션 쿠키 수집
    const step1 = await makeRequest(`${EP_BASE}/account/login.do`, {
      method: 'GET',
      headers: { 'User-Agent': ua, 'Accept': 'text/html,*/*' }
    });
    let cookieStr = mergeCookies('', step1.cookies);

    // Step 2: 로그인 POST
    const postData = `j_username=${encodeURIComponent(username)}&j_password=${encodeURIComponent(password)}`;
    const step2 = await makeRequest(`${EP_BASE}/j_spring_security_check`, {
      method: 'POST',
      headers: {
        'User-Agent': ua,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Referer': `${EP_BASE}/account/login.do`,
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Cookie': cookieStr,
      }
    }, postData);
    cookieStr = mergeCookies(cookieStr, step2.cookies);

    // Step 3: 리다이렉트 따라가기 (최대 5회)
    let location = step2.location;
    for (let i = 0; i < 5 && location; i++) {
      const nextUrl = location.startsWith('http') ? location : `${EP_BASE}${location}`;
      const stepN = await makeRequest(nextUrl, {
        method: 'GET',
        headers: { 'User-Agent': ua, 'Cookie': cookieStr, 'Accept': 'text/html,*/*' }
      });
      cookieStr = mergeCookies(cookieStr, stepN.cookies);
      location = stepN.location;

      // 로그인 실패: 다시 로그인 페이지로 돌아온 경우
      if (nextUrl.includes('login') && nextUrl.includes('error')) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
      }
    }

    // Step 4: v3 메인 페이지 접근 (v3 세션 초기화)
    const verifyV3 = await makeRequest(`${EP_BASE}/v3/main.do`, {
      method: 'GET',
      headers: { 'User-Agent': ua, 'Cookie': cookieStr, 'Accept': 'text/html,*/*' }
    });
    cookieStr = mergeCookies(cookieStr, verifyV3.cookies);
    if (verifyV3.status === 302 && verifyV3.location?.includes('login')) {
      return res.status(401).json({ error: '로그인 실패. 아이디/비밀번호를 확인하세요.' });
    }

    // Step 5: WebFlow 컨텍스트 초기화 (list_MyWrite.do 접근을 위해 필수)
    const verifyWF = await makeRequest(`${EP_BASE}/WebFlow/list_MyWrite.do`, {
      method: 'GET',
      headers: { 'User-Agent': ua, 'Cookie': cookieStr, 'Accept': 'text/html,*/*', 'Referer': `${EP_BASE}/v3/main.do` }
    });
    cookieStr = mergeCookies(cookieStr, verifyWF.cookies);

    // Step 6: 리다이렉트가 있으면 따라가기
    if (verifyWF.location) {
      const wfRedirect = verifyWF.location.startsWith('http') ? verifyWF.location : `${EP_BASE}${verifyWF.location}`;
      const verifyWF2 = await makeRequest(wfRedirect, {
        method: 'GET',
        headers: { 'User-Agent': ua, 'Cookie': cookieStr, 'Accept': 'text/html,*/*' }
      });
      cookieStr = mergeCookies(cookieStr, verifyWF2.cookies);
    }

    return res.status(200).json({ success: true, sessionCookie: cookieStr, message: '로그인 성공' });

  } catch (err) {
    return res.status(500).json({ error: '서버 오류: ' + err.message });
  }
};
