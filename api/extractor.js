// api/extractor.js — extractor 스크립트를 직접 서빙
const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const filePath = path.join(process.cwd(), 'extractor.js');
    const content = fs.readFileSync(filePath, 'utf8');
    return res.status(200).send(content);
  } catch(e) {
    return res.status(500).send('// Error: ' + e.message);
  }
};
