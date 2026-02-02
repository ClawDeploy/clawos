# Alternatif Node İndirme Yöntemleri

## Hata: Bağlantı Kapatıldı

GitHub'dan doğrudan indirilemedi. Alternatifler:

---

## 1. WGET ile Dene
```powershell
wget "https://github.com/clawdbot/node/releases/latest/download/clawdbot-node-windows-amd64.exe" -O "C:\Program Files\Clawdbot\node.exe"
```

## 2. BITS ile Dene (Windows)
```powershell
Start-BitsTransfer -Source "https://github.com/clawdbot/node/releases/latest/download/clawdbot-node-windows-amd64.exe" -Destination "C:\Program Files\Clawdbot\node.exe"
```

## 3. Manuel İndir (En Kolay)
1. Chrome/Edge aç
2. GitHub'a git: https://github.com/clawdbot/node/releases/latest
3. `clawdbot-node-windows-amd64.exe` dosyasını indir
4. `C:\Program Files\Clawdbot\` klasörüne taşı
5. Çift tıkla çalıştır

## 4. Farklı Kaynak
```powershell
Invoke-WebRequest -Uri "https://clawd.bot/downloads/node-windows.exe" -OutFile "C:\Program Files\Clawdbot\node.exe"
```

## 5. Python ile Dene
```powershell
python -c "import urllib.request; urllib.request.urlretrieve('https://github.com/clawdbot/node/releases/latest/download/clawdbot-node-windows-amd64.exe', 'C:\Program Files\Clawdbot\node.exe')"
```

---

## Çalıştıktan Sonra
Node açıldığında ekranda **pairing kodu** göreceksin. Bana yaz!
