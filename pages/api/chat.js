import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // 读取public/chat/index.html文件内容
  const htmlPath = path.join(process.cwd(), 'public', 'chat', 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // 设置响应头为text/html
  res.setHeader('Content-Type', 'text/html');
  
  // 返回HTML内容
  res.status(200).send(htmlContent);
}