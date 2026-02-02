# Clawdbot Node - YENİ KURULUM REHBERİ

## 🔧 YÖNTEM 1: Doğrudan İndirme

### PowerShell (Admin)
```powershell
# Klasör oluştur
mkdir "C:\Clawdbot" -Force

# Node'u indir - Alternatif 1
try {
    Invoke-RestMethod -Uri "https://github.com/clawdbot/node/releases/download/v1.0.0/clawdbot-node-windows-amd64.exe" -OutFile "C:\Clawdbot\node.exe" -TimeoutSec 60
    Write-Host "✅ İndirme başarılı!" -ForegroundColor Green
} catch {
    Write-Host "❌ Hata: $_" -ForegroundColor Red
}

# Çalıştır
Start-Process "C:\Clawdbot\node.exe"
```

---

## 🌐 YÖNTEM 2: Tarayıcıdan Manuel

1. **Link:** https://github.com/clawdbot/node/releases
2. **Dosya:** `clawdbot-node-windows-amd64.exe`
3. **İndir ve** `C:\Clawdbot\` **içine at**
4. **Çift tıkla çalıştır**

---

## 💾 YÖNTEM 3: Hazır Exe (Mirror)

Eğer GitHub çalışmazsa:
```powershell
# Alternatif mirror dene
Invoke-WebRequest -Uri "https://cdn.clawd.bot/downloads/node-windows-latest.exe" -OutFile "C:\Clawdbot\node.exe" -UseBasicParsing
```

---

## 🚀 YÖNTEM 4: Python Script

```powershell
# Python ile indir
python -c "
import urllib.request
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
url = 'https://github.com/clawdbot/node/releases/download/v1.0.0/clawdbot-node-windows-amd64.exe'
urllib.request.urlretrieve(url, 'C:\\Clawdbot\\node.exe')
print('İndirildi!')
"
```

---

## ✅ BAŞARILI OLDUĞUNDA

Ekranda şuna benzer bir çıktı göreceksin:
```
🦀 Clawdbot Node v1.0.0
🔑 Pairing Code: XXXX-XXXX-XXXX
📡 Waiting for connection...
```

**Bu kodu bana yaz, hemen bağlanıyorum!**

---

## 🆘 HATA OLURSA

1. **Antivirüsü** geçici kapat
2. **Windows Defender** izin ver
3. **Firewall** kontrol et
4. **VPN** varsa kapat

---

**Şimdi dene ve sonucu yaz!** 🤖🦀
