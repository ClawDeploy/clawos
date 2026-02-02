# OpenClaw Sıfırdan Kurulum (Windows)

## 📥 KURULUM ADIMLARI

### 1. İndir
```powershell
# Klasör oluştur
mkdir "C:\OpenClaw" -Force

# OpenClaw indir (GitHub releases)
Invoke-WebRequest -Uri "https://github.com/openclaw/openclaw/releases/latest/download/openclaw-windows-amd64.exe" -OutFile "C:\OpenClaw\openclaw.exe" -UseBasicParsing

# Veya zip olarak indir
Invoke-WebRequest -Uri "https://github.com/openclaw/openclaw/releases/latest/download/openclaw-windows-amd64.zip" -OutFile "C:\OpenClaw\openclaw.zip" -UseBasicParsing

# Zip'i çıkar
Expand-Archive -Path "C:\OpenClaw\openclaw.zip" -DestinationPath "C:\OpenClaw\" -Force
```

### 2. PATH'e Ekle
```powershell
# Sistem PATH'e ekle
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\OpenClaw", [EnvironmentVariableTarget]::Machine)

# Yeni PATH'i yükle
$env:Path = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
```

### 3. Kurulumu Doğrula
```powershell
openclaw --version
openclaw --help
```

---

## 🚀 OPENCLAW NODE BAŞLATMA

### Node'u Başlat
```powershell
openclaw node run --host 100.110.248.107 --port 18789 --display-name "Loki-Node"
```

### Servis Olarak Kur
```powershell
# Kurulum
openclaw node install --host 100.110.248.107 --port 18789 --display-name "Loki-Node"

# Başlat
openclaw node restart
```

---

## ⚡ HIZLI KURULUM (Hepsi Bir Arada)

```powershell
# 1. Klasör
mkdir "C:\OpenClaw" -Force

# 2. İndir
cd C:\OpenClaw
curl -LO https://github.com/openclaw/openclaw/releases/latest/download/openclaw-windows-amd64.exe

# 3. PATH ekle
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\OpenClaw", "Machine")

# 4. Yeniden başlat gerekebilir
# Veya şunu dene:
$env:Path += ";C:\OpenClaw"

# 5. Test
openclaw --version

# 6. Node başlat
openclaw node run --host 100.110.248.107 --port 18789 --display-name "Loki"
```

---

## 🎯 SONRA

Ekranda **pairing code** çıkacak:
```
🔑 Pairing Code: ABCD-1234-EFGH
📡 Waiting for connection...
```

**Bu kodu bana yaz, bağlanıyorum!** 🤖🦀
