# Windows PowerShell Node Kurulum

## Doğru Komutlar

### 1. Klasör Oluştur
```powershell
New-Item -ItemType Directory -Force -Path "C:\Program Files\Clawdbot"
```

### 2. Node'u İndir (PowerShell)
```powershell
Invoke-WebRequest -Uri "https://github.com/clawdbot/node/releases/latest/download/clawdbot-node-windows-amd64.exe" -OutFile "C:\Program Files\Clawdbot\node.exe" -UseBasicParsing
```

### 3. Çalıştır
```powershell
& "C:\Program Files\Clawdbot\node.exe"
```

---

## Alternatif: WGET ile
```powershell
wget "https://github.com/clawdbot/node/releases/latest/download/clawdbot-node-windows-amd64.exe" -O "C:\Program Files\Clawdbot\node.exe"
```

---

## Veya Manuel
1. Tarayıcıdan indir: https://github.com/clawdbot/node/releases/latest
2. `clawdbot-node-windows-amd64.exe` dosyasını indir
3. `C:\Program Files\Clawdbot\` klasörüne kopyala
4. Çift tıkla çalıştır

---

## Çalıştıktan Sonra
Ekranda **claim kodu** veya **pairing kodu** göreceksin. Bana yaz!
