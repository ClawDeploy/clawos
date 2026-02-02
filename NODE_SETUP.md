# Clawdbot Node Kurulum Rehberi

## Windows Node Kurulum Adımları

### 1. Node'u İndir
```powershell
# PowerShell Administrator olarak çalıştır
Invoke-WebRequest -Uri "https://github.com/clawdbot/node/releases/download/v1.0.0/clawdbot-node-windows-amd64.exe" -OutFile "C:\Program Files\Clawdbot\clawdbot-node.exe"
```

### 2. Klasör Oluştur
```powershell
New-Item -ItemType Directory -Force -Path "C:\Program Files\Clawdbot"
New-Item -ItemType Directory -Force -Path "C:\ProgramData\Clawdbot"
```

### 3. Çalıştır
```powershell
& "C:\Program Files\Clawdbot\clawdbot-node.exe"
```

### 4. Eşleştirme Kodu
Ekranda çıkan kodu bana ver.

---

## Alternatif: Manuel İndirme

1. GitHub'dan indir:
   https://github.com/clawdbot/node/releases

2. `clawdbot-node-windows.exe` dosyasını indir

3. Çift tıkla çalıştır

4. Eşleştirme kodunu bana söyle

---

## Bağlantı Sonrası

Node çalıştığında bana bildir, hemen bağlanıp Loki'yi ayarlayacağım.
