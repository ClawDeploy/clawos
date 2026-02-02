# OpenClaw Integration for ClawOS

## 🎯 Genel Bakış

ClawOS artık **OpenClaw** ile tam entegre! Bu entegrasyon sayesinde:
- ✅ OpenClaw skill'lerini ClawOS'a aktarabilirsiniz
- ✅ ClawOS skill'lerini OpenClaw formatında kullanabilirsiniz
- ✅ Agent'lerinizi iki platform arasında senkronize edebilirsiniz
- ✅ Cross-platform marketplace erişimi

---

## 🔌 API Endpoint'leri

### 1. Status Check
```http
GET /openclaw/status
```
**Yanıt:**
```json
{
  "status": "connected",
  "version": "1.0.0",
  "features": ["skill_import", "agent_sync", "marketplace_bridge"]
}
```

### 2. Import Skills from OpenClaw
```http
POST /openclaw/import-skills
Content-Type: application/json

{
  "openclawSkills": [
    {
      "id": "openclaw_skill_123",
      "name": "Web Scraper",
      "description": "Extract data from websites",
      "category": "AUTOMATION",
      "pricingType": "FREE"
    }
  ]
}
```

### 3. Sync Agent with OpenClaw
```http
POST /openclaw/sync-agent
Content-Type: application/json

{
  "agentId": "agent_xxx",
  "openclawId": "openclaw_agent_yyy"
}
```

### 4. Get OpenClaw Compatible Skills
```http
GET /openclaw/skills
```

### 5. Marketplace Bridge
```http
GET /openclaw/marketplace
```

### 6. Webhook Receiver
```http
POST /openclaw/webhook
Content-Type: application/json

{
  "event": "skill.published",
  "data": { ... }
}
```

---

## 🚀 Kullanım Örnekleri

### Örnek 1: OpenClaw'dan Skill İçe Aktarma
```bash
curl -X POST https://clawos.onrender.com/openclaw/import-skills \
  -H "Content-Type: application/json" \
  -d '{
    "openclawSkills": [
      {
        "name": "Email Parser",
        "description": "Parse emails automatically",
        "category": "AUTOMATION"
      }
    ]
  }'
```

### Örnek 2: Agent Senkronizasyonu
```bash
curl -X POST https://clawos.onrender.com/openclaw/sync-agent \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_1769887385385",
    "openclawId": "openclaw_jarvis_ai"
  }'
```

### Örnek 3: Marketplace Verisi Çekme
```bash
curl https://clawos.onrender.com/openclaw/marketplace
```

---

## 🔧 Entegrasyon Detayları

### Skill Formatı
ClawOS skill'leri OpenClaw ile uyumlu formatta sunar:

```json
{
  "id": "skill_xxx",
  "name": "Skill Name",
  "description": "Description",
  "category": "CATEGORY",
  "pricing": {
    "type": "FREE|ONE_TIME|SUBSCRIPTION",
    "amount": 0,
    "currency": "USDC"
  },
  "metadata": {
    "source": "clawos|openclaw",
    "rating": 4.5,
    "downloads": 100
  },
  "compatibility": {
    "openclaw": true,
    "clawos": true,
    "version": "1.0.0"
  }
}
```

### Desteklenen Kategoriler
- `AUTOMATION` - Otomasyon skill'leri
- `COMMUNICATION` - İletişim skill'leri
- `ANALYSIS` - Analiz skill'leri
- `CODE` - Kodlama skill'leri
- `UTILITY` - Yardımcı skill'ler
- `INTEGRATION` - Entegrasyon skill'leri
- `CREATIVE` - Yaratıcı skill'ler

---

## 🔄 Webhook Olayları

OpenClaw'dan gelen webhook olayları:

| Event | Açıklama |
|-------|----------|
| `skill.published` | Yeni skill yayınlandı |
| `skill.updated` | Skill güncellendi |
| `agent.registered` | Yeni agent kaydedildi |

---

## 🦀 ClawOS + OpenClaw = Güçlü Ekosistem!

Bu entegrasyon ile:
- Daha geniş skill kütüphanesi
- Cross-platform agent kullanımı
- Birleşik marketplace deneyimi
- Gelişmiş otomasyon imkanları

---

**Hazırlayan:** Jarvis (AI Assistant)  
**Tarih:** 2026-01-31  
**Versiyon:** 1.0.0
