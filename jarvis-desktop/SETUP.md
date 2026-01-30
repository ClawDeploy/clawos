# Jarvis Desktop Widget - Kurulum Rehberi 🤖

## Windows Kurulum

### 1. Python Kurulumu
- [Python 3.8+](https://www.python.org/downloads/) indir ve kur
- Kurulumda **"Add Python to PATH"** seçeneğini işaretle

### 2. Jarvis Dosyalarını İndir
Projeyi bilgisayarına kaydet (örn: `C:\Jarvis\`)

### 3. Bağımlılıkları Kur
Komut İstemi'ni (CMD) aç ve proje klasörüne git:
```bash
cd C:\Jarvis
pip install -r requirements.txt
```

### 4. Clawdbot Bağlantısını Yapılandır

#### 4a. Gateway Token Al
Telegram'dan Clawdbot'a yaz:
```
/token
```
Gelen token'ı kopyala.

#### 4b. Config Dosyasını Düzenle
`config.json` dosyasını aç ve düzenle:

```json
{
  "gateway_url": "http://localhost:3000",
  "token": "gelen-token-buraya-yapıştır"
}
```

**Not:** Clawdbot farklı bir portta çalışıyorsa URL'yi ona göre değiştir.

### 5. Jarvis'i Başlat
```bash
python jarvis_widget.py
```

## İlk Çalıştırma

Jarvis sağ alt köşede belirecek ve "Jarvis aktif! 🤖" diyecek.

### Test Et
1. Jarvis'e çift tıkla
2. Mesaj kutusuna "Merhaba" yaz ve Enter'a bas
3. Jarvis düşünecek ve cevap verecek

### System Tray'de Jarvis
Sağ altta (bildirim alanında) mavi nokta ikonu görünecek:
- Sol tıklama: Göster/Gizle
- Sağ tıklama: Menü

## Sorun Giderme

### "No module named PyQt5"
```bash
pip install PyQt5
```

### "Connection refused" / "Bağlantı hatası"
- Clawdbot Gateway çalışıyor mu kontrol et
- `config.json`'daki URL ve token doğru mu?
- Firewall Jarvis'i engelliyor mu?

### Jarvis görünmüyor
- System tray'deki ikona sağ tıkla → "Göster"
- Veya programı yeniden başlat

### Token nasıl alınır?
Telegram'dan Clawdbot'a:
```
/token
```
veya
```
help token
```

## Windows Başlangıcında Otomatik Başlatma

### Yöntem 1: Başlangıç Klasörü
1. `Win + R` bas, `shell:startup` yaz, Enter
2. Masaüstünde `jarvis_widget.py`'a sağ tıkla → "Kısayol oluştur"
3. Kısayolu Başlangıç klasörüne taşı
4. Kısayola sağ tıkla → Özellikler
5. Hedef: `"C:\Python3X\python.exe" "C:\Jarvis\jarvis_widget.py"`

### Yöntem 2: Bat dosyası oluştur
`start_jarvis.bat` adında bir dosya oluştur:
```batch
@echo off
cd C:\Jarvis
pythonw jarvis_widget.py
```
Bu bat dosyasını Başlangıç klasörüne koy.

**Not:** `pythonw` kullanmak komut penceresi açılmasını engeller.

## İpuçları

- **Jarvis'i taşı**: Sol tıklayıp sürükle
- **Hızlı konuş**: System tray → Sağ tıkla → 💬 Konuş
- **Kapat**: System tray → Sağ tıkla → Çıkış
- **Gizle**: Sol tıkla sistem tray ikonuna

---

Yardım lazım mı? Telegram'dan bana yaz: @hypermaddd
