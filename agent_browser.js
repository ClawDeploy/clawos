// Browser Automation Agent v3.0 - Puppeteer ile
const express = require('express');
const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const app = express();
app.use(express.json());

const PORT = 3001;
const HOST = '100.110.248.107';

// Global browser instance
let browser = null;
let page = null;

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        agent: 'Jarvis-PC-BrowserControl',
        version: '3.0',
        browser: browser ? 'connected' : 'disconnected',
        time: new Date().toISOString()
    });
});

// Komut listesi
app.get('/commands', (req, res) => {
    res.json({
        system: ['status', 'processes', 'ip', 'screenshot'],
        browser: ['browser-start', 'browser-close', 'browser-screenshot'],
        navigation: ['goto-url', 'gmail-inbox', 'gmail-compose'],
        interaction: ['click', 'type', 'press-enter', 'scroll-down', 'get-text'],
        gmail: ['gmail-check-new', 'gmail-read-first', 'gmail-reply']
    });
});

// Browser'ı başlat (Mevcut Chrome profili ile)
async function startBrowser() {
    if (browser) return { result: 'Browser zaten açık' };
    
    try {
        const userDataDir = process.env.USERPROFILE + '\\AppData\\Local\\Google\\Chrome\\User Data';
        
        browser = await puppeteer.launch({
            headless: false,
            args: ['--start-maximized', '--profile-directory=Default'],
            userDataDir: userDataDir,
            defaultViewport: null
        });
        page = await browser.newPage();
        return { result: 'Browser başlatıldı (Oturumlar yüklendi)' };
    } catch (e) {
        return { error: e.message };
    }
}

// Komut çalıştırma
app.post('/command', async (req, res) => {
    const { command, args } = req.body;
    console.log(`[${new Date().toLocaleTimeString()}] 🤖 Komut: ${command}`);
    
    try {
        let result;
        
        switch(command) {
            // === BROWSER KONTROL ===
            case 'browser-start':
                const start = await startBrowser();
                result = start.result || start.error;
                break;
                
            case 'browser-close':
                if (browser) {
                    await browser.close();
                    browser = null;
                    page = null;
                    result = 'Browser kapatıldı';
                } else {
                    result = 'Browser zaten kapalı';
                }
                break;
                
            case 'browser-screenshot':
                if (!page) throw new Error('Browser açık değil');
                const ssPath = `C:\\Jarvis\\screenshot_${Date.now()}.png`;
                await page.screenshot({ path: ssPath, fullPage: true });
                result = `Screenshot: ${ssPath}`;
                break;

            // === NAVİGASYON ===
            case 'goto-url':
                if (!browser) await startBrowser();
                if (!args) throw new Error('URL gerekli');
                await page.goto(args, { waitUntil: 'networkidle2' });
                result = `Gidildi: ${args}`;
                break;
                
            case 'gmail-inbox':
                if (!browser) await startBrowser();
                await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'networkidle2' });
                await page.waitForTimeout(3000);
                result = 'Gmail inbox açıldı';
                break;
                
            case 'gmail-compose':
                if (!browser) await startBrowser();
                await page.goto('https://mail.google.com/mail/u/0/#compose', { waitUntil: 'networkidle2' });
                result = 'Yeni mail penceresi açıldı';
                break;

            // === ETKİLEŞİM ===
            case 'click':
                if (!page) throw new Error('Browser açık değil');
                if (!args) throw new Error('Selector gerekli (örn: button, .class, #id)');
                await page.click(args);
                result = `Tıklandı: ${args}`;
                break;
                
            case 'type':
                if (!page) throw new Error('Browser açık değil');
                if (!args) throw new Error('Metin gerekli');
                const [selector, text] = args.split('|');
                await page.type(selector, text);
                result = `Yazıldı: ${text} -> ${selector}`;
                break;
                
            case 'press-enter':
                if (!page) throw new Error('Browser açık değil');
                await page.keyboard.press('Enter');
                result = 'Enter basıldı';
                break;
                
            case 'scroll-down':
                if (!page) throw new Error('Browser açık değil');
                await page.evaluate(() => window.scrollBy(0, 500));
                result = 'Aşağı scroll edildi';
                break;
                
            case 'get-text':
                if (!page) throw new Error('Browser açık değil');
                if (!args) throw new Error('Selector gerekli');
                const textContent = await page.$eval(args, el => el.textContent);
                result = `Metin: ${textContent}`;
                break;

            // === GMAİL ÖZEL ===
            case 'gmail-check-new':
                if (!browser) await startBrowser();
                await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'networkidle2' });
                await page.waitForTimeout(3000);
                
                // Okunmamış mail sayısını al
                const unreadCount = await page.evaluate(() => {
                    const badge = document.querySelector('[role="navigation"] .bsU');
                    return badge ? badge.textContent : '0';
                });
                
                result = `Okunmamış mail: ${unreadCount}`;
                break;
                
            case 'gmail-read-first':
                if (!page) throw new Error('Browser açık değil');
                
                // İlk maili aç
                await page.click('tr.zA');
                await page.waitForTimeout(2000);
                
                // Mail içeriğini al
                const content = await page.evaluate(() => {
                    const body = document.querySelector('.ii.gt');
                    return body ? body.innerText : 'İçerik bulunamadı';
                });
                
                result = `Mail içeriği: ${content.substring(0, 500)}...`;
                break;

            // === SİSTEM ===
            case 'status':
                result = `Browser: ${browser ? 'Açık' : 'Kapalı'}, Uptime: ${Math.floor(process.uptime()/60)} dk`;
                break;
                
            case 'screenshot':
                if (!page) throw new Error('Browser açık değil');
                const path = `C:\\Jarvis\\screenshot_${Date.now()}.png`;
                await page.screenshot({ path });
                result = `Screenshot: ${path}`;
                break;

            default:
                result = `Bilinmeyen komut: ${command}`;
        }
        
        console.log(`[${new Date().toLocaleTimeString()}] ✅ ${command}`);
        res.json({ status: 'success', command, result });
        
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ Hata:`, error.message);
        res.status(500).json({ status: 'error', command, error: error.message });
    }
});

// Cleanup
process.on('SIGINT', async () => {
    if (browser) await browser.close();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🤖 Browser Control Agent başladı! Port: ${PORT}`);
});
