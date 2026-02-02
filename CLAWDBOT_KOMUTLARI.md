# Clawdbot Node Kurulum (Bilgisayar Adı: clawdbot)

## ✅ DOĞRU KOMUTLAR

### 1. Node Başlat (Headless)
```powershell
clawdbot node run --host 100.110.248.107 --port 18789 --display-name "Loki-Node"
```

### 2. Node Servis Olarak Kur
```powershell
# Kur
clawdbot node install --host 100.110.248.107 --port 18789 --display-name "Loki-Node"

# Başlat
clawdbot node restart
```

### 3. Node Durumunu Kontrol Et
```powershell
# Tüm node'ları gör
clawdbot nodes status

# Onay bekleyen node'lar
clawdbot nodes pending

# Node'u onayla
clawdbot nodes approve <requestId>
```

### 4. Sistem Komutları Çalıştır
```powershell
# Test komutu
clawdbot nodes run --node <id> -- echo "Hello from Loki"

# Bildirim gönder
clawdbot nodes notify --node <id> --title "Loki Ready" --body "Node connected"
```

---

## 🔧 CLAWDBOT KURULU MU?

Kontrol et:
```powershell
clawdbot --version
```

**Çıktı alıyorsan** yukarıdaki komutlar çalışır.

**Hata alıyorsan** önce kurulum gerekir.

---

## 🚀 HIZLI BAŞLANGIÇ

```powershell
# 1. Node başlat
clawdbot node run --host 100.110.248.107 --port 18789 --display-name "Loki"

# 2. Ekranda pairing kodunu gör
# 3. Kodu bana ver
# 4. Bağlanıp Loki'yi set ediyorum!
```

**Şimdi dene!** 🤖🦀
