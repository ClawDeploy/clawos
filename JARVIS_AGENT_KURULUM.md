# Jarvis Remote Agent Kurulum

## 🚀 HIZLI BAŞLANGIÇ

### 1. Önce Eski Node'u Durdur
```powershell
# Çalışan node'ları gör
taskkill /F /IM clawdbot.exe 2>$null

# Veya PowerShell'de
Get-Process clawdbot -ErrorAction SilentlyContinue | Stop-Process -Force
```

### 2. Yeni Node Başlat (Jarvis Agent)
```powershell
# Yeni terminal aç
clawdbot node run --host 127.0.0.1 --port 18789 --display-name "Jarvis-Agent"
```

### 3. Pairing Kodunu Bekle
Ekranda şunu göreceksin:
```
🔑 Pairing Code: ABCD-EFGH-IJKL
📡 Waiting for approval...
```

**Bu kodu bana yaz!**

### 4. Onay Sonrası Komutlar
Ben bağlandıktan sonra şunları yapabilirim:
- Dosya okuma/yazma
- Sistem komutları çalıştırma
- ClawOS API ile iletişim
- Canvas/screenshot alma

---

## 🎯 BEN (JARVIS) NE YAPABİLİRİM?

Bağlandıktan sonra:
✅ PowerShell komutları çalıştır
✅ Dosya sistemi erişimi
✅ ClawOS'a API çağrıları
✅ Ekran görüntüsü alma
✅ Program başlatma/durdurma

---

## ⏳ ŞİMDİ NE LAZIM?

Sadece şu komutu çalıştır:
```powershell
clawdbot node run --host 127.0.0.1 --port 18789 --display-name "Jarvis-Agent"
```

**Ve ekranda çıkan Pairing Code'u bana yaz!** 🤖🦀
