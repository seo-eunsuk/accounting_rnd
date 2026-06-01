// api/login.js
// EP 시스템 로그인 프록시 - 서버에서 ep.fursys.com으로 요청 (CORS 우회)

const https = require('https');
const http = require('http');
const { URL } = require('url');

const EP_BASE = 'https://ep.fursys.com';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const protocol = options.url.startsWith('https') ? https : http;
    const urlObj = new URL(options.url);

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false, // 내부 인증서 허용
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];

      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies,
          body: data,
          location: res.headers['location'] || null,
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' });
  }

  try {
    // Step 1: 로그인 페이지 먼저 접근해서 세션/토큰 획득
    const loginPageRes = await makeRequest({
      url: `${EP_BASE}/v3/main.do`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    // 세션 쿠키 수집
    const sessionCookies = loginPageRes.cookies
      .map(c => c.split(';')[0])
      .join('; ');

    // Step 2: 로그인 POST
    const postData = new URLSearchParams({
      j_username: username,
      j_password: password,
    }).toString();

    const loginRes = await makeRequest({
      url: `${EP_BASE}/v3/j_spring_security_check`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${EP_BASE}/v3/main.do`,
        'Cookie': sessionCookies,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      }
    }, postData);

    // 로그인 성공 여부 확인
    const allCookies = [
      ...loginPageRes.cookies,
      ...loginRes.cookies,
    ];

    const cookieStr = allCookies.map(c => c.split(';')[0]).join('; ');

    // 로그인 실패 체크 (보통 login_error 파라미터로 리다이렉트)
    const location = loginRes.location || '';
    if (location.includes('login') && location.includes('error')) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    // Step 3: 로그인 후 메인 페이지 접근해서 세션 확인
    const mainRes = await makeRequest({
      url: `${EP_BASE}/v3/main.do`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookieStr,
        'Referer': `${EP_BASE}/v3/main.do`,
      }
    });

    // 로그인 페이지로 다시 리다이렉트되면 실패
    if (mainRes.status === 302 && mainRes.location && mainRes.location.includes('login')) {
      return res.status(401).json({ error: '로그인에 실패했습니다. 아이디/비밀번호를 확인하세요.' });
    }

    // 성공: 쿠키 반환 (이후 요청에 사용)
    return res.status(200).json({
      success: true,
      sessionCookie: cookieStr,
      message: '로그인 성공',
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: '서버 오류: ' + err.message });
  }
};
