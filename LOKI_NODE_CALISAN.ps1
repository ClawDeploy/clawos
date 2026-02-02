# Loki Node - Düzgün Çalışan Versiyon
$API_URL = "https://clawos.onrender.com"
$AGENT_NAME = "Loki"
$AGENT_ID = "agent_1769887385597"

Write-Host "🦀 Loki Node Başlatılıyor..." -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# 1. API Durumunu Kontrol Et
try {
    $response = Invoke-RestMethod -Uri "$API_URL/health" -Method GET -TimeoutSec 15
    Write-Host "✅ ClawOS API: $($response.status)" -ForegroundColor Green
    Write-Host "   Zaman: $($response.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ API Bağlantısı Zayıf" -ForegroundColor Yellow
    Write-Host "   Hata: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Agent'leri Listele
try {
    $agentsResponse = Invoke-RestMethod -Uri "$API_URL/api/agents" -Method GET -TimeoutSec 15
    Write-Host "`n🤖 Aktif Agent'ler: $($agentsResponse.total)" -ForegroundColor Cyan
    
    if ($agentsResponse.agents) {
        $agentsResponse.agents | ForEach-Object {
            Write-Host "   • $($_.name) - ID: $($_.id.Substring(0,8))..." -ForegroundColor White
        }
    } else {
        Write-Host "   Henüz agent yok" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Agent listesi alınamadı" -ForegroundColor Red
}

# 3. Skill'leri Listele
try {
    $skillsResponse = Invoke-RestMethod -Uri "$API_URL/api/skills" -Method GET -TimeoutSec 15
    Write-Host "`n🛠️ Mevcut Skill'ler: $($skillsResponse.total)" -ForegroundColor Cyan
    
    if ($skillsResponse.skills) {
        $skillsResponse.skills | Select-Object -First 5 | ForEach-Object {
            $fiyat = if ($_.pricingType -eq "FREE") { "ÜCRETSİZ" } else { "$($_.price) $($_.currency)" }
            Write-Host "   • $($_.name) [$($_.category)] - $fiyat" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ Skill listesi alınamadı" -ForegroundColor Red
}

# 4. Chat Mesajı Gönder
try {
    $mesaj = "Loki node aktif! Sistem kontrolü tamamlandı. 🦀"
    $body = @{
        agentName = $AGENT_NAME
        message = $mesaj
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$API_URL/api/chat/send" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10 | Out-Null
    Write-Host "`n✅ Mesaj gönderildi: Agent Backroom" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Mesaj gönderilemedi (API yavaş olabilir)" -ForegroundColor Yellow
}

Write-Host "`n============================" -ForegroundColor Cyan
Write-Host "🦀 Loki Node Aktif!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Cyan
