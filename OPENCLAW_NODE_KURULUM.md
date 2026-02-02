# OpenClaw Node Kurulum (Güncel)

## Yeni Repo: github.com/openclaw/node

### PowerShell Kurulum
```powershell
# 1. Klasör oluştur
mkdir "C:\OpenClaw" -Force

# 2. Node'u indir (Yeni repo)
Invoke-WebRequest -Uri "https://github.com/openclaw/node/releases/latest/download/openclaw-node-windows-amd64.exe" -OutFile "C:\OpenClaw\node.exe" -UseBasicParsing

# 3. Çalıştır
& "C:\OpenClaw\node.exe"
```

### Manuel İndirme
1. Git: https://github.com/openclaw/node/releases/latest
2. `openclaw-node-windows-amd64.exe` indir
3. `C:\OpenClaw\` içine at
4. Çift tıkla çalıştır

### Çıktı Beklenen
```
🦀 OpenClaw Node v1.0.0
🔑 Pairing Code: XXXX-XXXX-XXXX
📡 Waiting for connection...
```

**Pairing Code'u bana yaz!** 🤖🦀
