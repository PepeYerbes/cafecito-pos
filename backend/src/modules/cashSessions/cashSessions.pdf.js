import path from 'path';
import ejs from 'ejs';
import dayjs from 'dayjs';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';

export async function renderSessionPdf({ session, brand, pdfFullPath }) {
  const templatePath = path.join(path.dirname(new URL(import.meta.url).pathname), 'templates', 'cashSession.ejs');

  const html = await ejs.renderFile(templatePath, {
    session,
    brand,
    fmt: (d) => dayjs(d).format('DD/MM/YYYY HH:mm'),
    money: (n) => (n ?? 0).toFixed(2)
  }, { async: true });

  await fs.mkdir(path.dirname(pdfFullPath), { recursive: true });

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfFullPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' }
  });
  await browser.close();
}