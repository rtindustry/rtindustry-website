// Genera le immagini Open Graph del sito (img/og/*.png, 1200x630) dal modello
// og-template.html con i testi di varianti.json.
//
// Requisiti: Node.js, i pacchetti "puppeteer-core" e "sharp" (installati o
// raggiungibili tramite NODE_PATH) e Google Chrome installato.
// Uso:   node _strumenti/og/render.js
// Opz.:  CHROME_PATH=percorso/di/chrome.exe
//
// Le PNG vengono ridotte a palette (peso basso, WhatsApp scarta le immagini
// troppo pesanti) e salvate senza metadati.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const sharp = require('sharp');

const qui = __dirname;
const radice = path.resolve(qui, '..', '..');
const uscita = path.join(radice, 'img', 'og');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const { testi, varianti } = JSON.parse(fs.readFileSync(path.join(qui, 'varianti.json'), 'utf8'));

(async () => {
  fs.mkdirSync(uscita, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  const url = 'file:///' + path.join(qui, 'og-template.html').replace(/\\/g, '/');
  for (const v of varianti) {
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate((v, t) => {
      document.documentElement.lang = v.lang;
      document.getElementById('sezione').textContent = v.sezione;
      document.getElementById('claim').innerHTML = v.claim;
      document.querySelectorAll('[data-k]').forEach(el => { el.textContent = t[el.dataset.k]; });
    }, v, testi[v.lang]);
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ type: 'png' });
    const file = path.join(uscita, v.file);
    await sharp(png).png({ palette: true, quality: 90, colours: 256, effort: 10, compressionLevel: 9 }).toFile(file);
    const m = await sharp(file).metadata();
    console.log(v.file, m.width + 'x' + m.height, Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
