// Jarvis-PC Tam Kontrol Agent v2.0
const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execPromise = util.promisify(exec);
const app = express();
app.use(express.json());

const PORT = 3001;
const HOST = '100.110.248.107';

// CORS ayarları
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        agent: 'Jarvis-PC-FullControl',
        version: '2.0',
        time: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Komut listesi
app.get('/commands', (req, res) => {
    res.json({
        system: ['status', 'processes', 'ip', 'uptime', 'battery', 'screenshot'],
        power: ['shutdown', 'restart', 'hibernate', 'sleep', 'lock', 'cancel-shutdown'],
        volume: ['volume-up', 'volume-down', 'volume-mute', 'volume-max'],
        apps: ['open-chrome', 'open-firefox', 'open-edge', 'open-explorer', 'open-notepad', 'open-calc', 'open-cmd', 'open-taskmgr', 'open-vscode'],
        files: ['list-desktop', 'list-downloads', 'list-documents', 'list-pictures', 'open-desktop', 'open-downloads', 'open-documents'],
        browser: ['open-url', 'search-google', 'search-youtube'],
        input: ['type-text', 'press-key', 'click'],
        misc: ['say-hello', 'notify', 'run']
    });
});

// Komut çalıştırma
app.post('/command', async (req, res) => {
    const { command, args } = req.body;
    console.log(`[${new Date().toLocaleTimeString()}] 🤖 Komut: ${command} ${args || ''}`);
    
    try {
        let result;
        
        switch(command) {
            // === SİSTEM KOMUTLARI ===
            case 'status':
                result = await getSystemStatus();
                break;
                
            case 'processes':
                result = await getProcesses();
                break;
                
            case 'ip':
                result = await getIPAddresses();
                break;
                
            case 'uptime':
                result = await getUptime();
                break;
                
            case 'battery':
                result = await getBatteryStatus();
                break;
                
            case 'screenshot':
                result = await takeScreenshot();
                break;

            // === GÜÇ KOMUTLARI ===
            case 'shutdown':
                exec('shutdown /s /t 60 /c "Jarvis tarafından kapatılıyor..."');
                result = '⚠️ PC 60 saniye içinde kapatılacak. İptal: cancel-shutdown';
                break;
                
            case 'restart':
                exec('shutdown /r /t 60 /c "Jarvis tarafından restart ediliyor..."');
                result = '⚠️ PC 60 saniye içinde restart edilecek. İptal: cancel-shutdown';
                break;
                
            case 'hibernate':
                exec('rundll32.exe powrprof.dll,SetSuspendState 1,1,0');
                result = '💤 Hibernate moduna geçiliyor...';
                break;
                
            case 'sleep':
                exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
                result = '💤 Sleep moduna geçiliyor...';
                break;
                
            case 'lock':
                exec('rundll32.exe user32.dll,LockWorkStation');
                result = '🔒 PC kitlendi.';
                break;
                
            case 'cancel-shutdown':
                exec('shutdown /a');
                result = '✅ Shutdown/restart iptal edildi.';
                break;

            // === SES KOMUTLARI ===
            case 'volume-up':
                exec('nircmd.exe changesysvolume 5000');
                result = '🔊 Ses artırıldı.';
                break;
                
            case 'volume-down':
                exec('nircmd.exe changesysvolume -5000');
                result = '🔉 Ses azaltıldı.';
                break;
                
            case 'volume-mute':
                exec('nircmd.exe mutesysvolume 2');
                result = '🔇 Ses kapatıldı/açıldı.';
                break;
                
            case 'volume-max':
                exec('nircmd.exe setsysvolume 65535');
                result = '🔊 Ses maksimum yapıldı.';
                break;

            // === UYGULAMA KOMUTLARI ===
            case 'open-chrome':
                exec('start chrome');
                result = '🌐 Chrome açıldı.';
                break;
                
            case 'open-firefox':
                exec('start firefox');
                result = '🦊 Firefox açıldı.';
                break;
                
            case 'open-edge':
                exec('start msedge');
                result = '🌊 Edge açıldı.';
                break;
                
            case 'open-explorer':
                exec('start explorer');
                result = '📁 Explorer açıldı.';
                break;
                
            case 'open-notepad':
                exec('start notepad');
                result = '📝 Notepad açıldı.';
                break;
                
            case 'open-calc':
                exec('start calc');
                result = '🧮 Hesap makinesi açıldı.';
                break;
                
            case 'open-cmd':
                exec('start cmd');
                result = '💻 Command Prompt açıldı.';
                break;
                
            case 'open-taskmgr':
                exec('start taskmgr');
                result = '📊 Task Manager açıldı.';
                break;
                
            case 'open-vscode':
                exec('start code');
                result = '💻 VS Code açıldı.';
                break;

            // === DOSYA KOMUTLARI ===
            case 'list-desktop':
                result = await listDirectory(process.env.USERPROFILE + '\\Desktop');
                break;
                
            case 'list-downloads':
                result = await listDirectory(process.env.USERPROFILE + '\\Downloads');
                break;
                
            case 'list-documents':
                result = await listDirectory(process.env.USERPROFILE + '\\Documents');
                break;
                
            case 'list-pictures':
                result = await listDirectory(process.env.USERPROFILE + '\\Pictures');
                break;
                
            case 'open-desktop':
                exec(`start explorer "${process.env.USERPROFILE}\\Desktop"`);
                result = '📁 Desktop klasörü açıldı.';
                break;
                
            case 'open-downloads':
                exec(`start explorer "${process.env.USERPROFILE}\\Downloads"`);
                result = '📁 Downloads klasörü açıldı.';
                break;
                
            case 'open-documents':
                exec(`start explorer "${process.env.USERPROFILE}\\Documents"`);
                result = '📁 Documents klasörü açıldı.';
                break;

            // === BROWSER KOMUTLARI ===
            case 'open-url':
                if (!args) throw new Error('URL gerekli');
                exec(`start chrome "${args}"`);
                result = `🌐 ${args} açıldı.`;
                break;
                
            case 'search-google':
                if (!args) throw new Error('Arama terimi gerekli');
                exec(`start chrome "https://google.com/search?q=${encodeURIComponent(args)}"`);
                result = `🔍 Google: "${args}" arandı.`;
                break;
                
            case 'search-youtube':
                if (!args) throw new Error('Arama terimi gerekli');
                exec(`start chrome "https://youtube.com/results?search_query=${encodeURIComponent(args)}"`);
                result = `🎥 YouTube: "${args}" arandı.`;
                break;

            // === GİRİŞ KOMUTLARI (NirCmd gerekli) ===
            case 'type-text':
                if (!args) throw new Error('Metin gerekli');
                exec(`nircmd.exe sendkeypress ${args}`);
                result = `⌨️ Yazıldı: ${args}`;
                break;
                
            case 'press-key':
                if (!args) throw new Error('Tuş gerekli');
                exec(`nircmd.exe sendkeypress ${args}`);
                result = `⌨️ Tuşa basıldı: ${args}`;
                break;
                
            case 'click':
                exec('nircmd.exe sendmouse left click');
                result = '🖱️ Sol tık yapıldı.';
                break;

            // === BİLDİRİM KOMUTLARI ===
            case 'notify':
                const msg = args || 'Jarvis bildirimi!';
                exec(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${msg}', 'Jarvis')"`);
                result = `📢 Bildirim gösterildi: ${msg}`;
                break;
                
            case 'say-hello':
                exec('powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'Merhaba, ben Jarvis. Size nasıl yardımcı olabilirim?\')"');
                result = '🗣️ Merhaba dedim!';
                break;

            // === ÖZEL KOMUTLAR ===
            case 'run':
                if (!args) throw new Error('Komut gerekli');
                const { stdout, stderr } = await execPromise(args, { timeout: 30000 });
                result = stdout || stderr || 'Komut çalıştırıldı.';
                break;

            default:
                result = `❌ Bilinmeyen komut: ${command}. /commands adresinden liste görüntüleyin.`;
        }
        
        console.log(`[${new Date().toLocaleTimeString()}] ✅ ${command} çalıştı`);
        res.json({ status: 'success', command, result });
        
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ Hata:`, error.message);
        res.status(500).json({ status: 'error', command, error: error.message });
    }
});

// === YARDIMCI FONKSİYONLAR ===

async function getSystemStatus() {
    try {
        const cpu = await execPromise('wmic cpu get loadpercentage /value');
        const mem = await execPromise('wmic computersystem get totalphysicalmemory,totalvisiblememorysize /value');
        const disk = await execPromise('wmic logicaldisk where "DeviceID=\'C:\\'" get freespace,size /value');
        
        return `🖥️ Jarvis-PC Status:\nCPU: ${cpu.stdout.match(/\d+/)?.[0] || 'N/A'}%\nRAM: ${formatBytes(parseInt(mem.stdout.match(/TotalVisibleMemorySize=(\d+)/)?.[1] || 0) * 1024)}\nDisk: ${formatBytes(parseInt(disk.stdout.match(/FreeSpace=(\d+)/)?.[1] || 0))} boş`;
    } catch (e) {
        return `🖥️ PC Çalışıyor - ${new Date().toLocaleTimeString()}`;
    }
}

async function getProcesses() {
    try {
        const { stdout } = await execPromise('wmic process get name,processid,workingsetsize /format:csv | findstr /v "^$" | head -20');
        return `📊 Çalışan işlemler:\n${stdout}`;
    } catch (e) {
        return '❌ İşlemler alınamadı';
    }
}

async function getIPAddresses() {
    try {
        const { stdout } = await execPromise('ipconfig | findstr "IPv4"');
        return `🌐 IP Adresleri:\n${stdout}`;
    } catch (e) {
        return `🌐 Tailscale: 100.110.248.107`;
    }
}

async function getUptime() {
    try {
        const { stdout } = await execPromise('wmic os get lastbootuptime /value');
        return `⏱️ Uptime: ${stdout}`;
    } catch (e) {
        return `⏱️ Agent Uptime: ${Math.floor(process.uptime() / 60)} dakika`;
    }
}

async function getBatteryStatus() {
    try {
        const { stdout } = await execPromise('wmic path win32_battery get estimatedchargeremaining /value');
        const battery = stdout.match(/\d+/)?.[0];
        return battery ? `🔋 Pil: ${battery}%` : '🔌 Masaüstü PC (Pil yok)';
    } catch (e) {
        return '🔌 Pil bilgisi alınamadı';
    }
}

async function takeScreenshot() {
    try {
        const timestamp = Date.now();
        const screenshotPath = `C:\\Jarvis\\screenshots\\screenshot_${timestamp}.png`;
        
        // Klasör yoksa oluştur
        if (!fs.existsSync('C:\\Jarvis\\screenshots')) {
            fs.mkdirSync('C:\\Jarvis\\screenshots', { recursive: true });
        }
        
        // NirCmd ile ekran görüntüsü al
        await execPromise(`nircmd.exe savescreenshot "${screenshotPath}"`);
        
        return `📸 Ekran görüntüsü alındı: ${screenshotPath}`;
    } catch (e) {
        return `❌ Ekran görüntüsü alınamadı: ${e.message}`;
    }
}

async function listDirectory(dirPath) {
    try {
        const files = fs.readdirSync(dirPath);
        const fileList = files.slice(0, 20).map(f => `  • ${f}`).join('\n');
        return `📁 ${path.basename(dirPath)} (${files.length} dosya):\n${fileList}${files.length > 20 ? '\n  ... ve ' + (files.length - 20) + ' dosya daha' : ''}`;
    } catch (e) {
        return `❌ Klasör okunamadı: ${e.message}`;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`[${new Date().toLocaleTimeString()}] 🤖 Jarvis-PC FullControl başladı!`);
    console.log(`[${new Date().toLocaleTimeString()}] 🌐 Port: ${PORT}`);
    console.log(`[${new Date().toLocaleTimeString()}] 📡 Health: http://${HOST}:${PORT}/health`);
    console.log(`[${new Date().toLocaleTimeString()}] 📋 Komutlar: http://${HOST}:${PORT}/commands`);
});

// Hata yakalama
process.on('uncaughtException', (err) => {
    console.error('❌ Hata:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Promise Hatası:', err);
});
