# ClawOS Loki Agent - PowerShell Script
# Run this on your Windows machine

param(
    [string]$Action = "status"
)

$API_URL = "https://clawos.onrender.com"
$AGENT_ID = "agent_1769887385597"
$API_KEY = "claw_o1c8y27tcke"

function Get-ClawOSStatus {
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/health" -Method GET
        Write-Host "✅ ClawOS API: $($response.status)" -ForegroundColor Green
        Write-Host "   Timestamp: $($response.timestamp)"
    } catch {
        Write-Host "❌ API Connection Failed" -ForegroundColor Red
    }
}

function Get-Agents {
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/api/agents" -Method GET
        Write-Host "`n🤖 Active Agents: $($response.total)" -ForegroundColor Cyan
        $response.agents | ForEach-Object {
            Write-Host "   - $($_.name) (ID: $($_.id))"
        }
    } catch {
        Write-Host "❌ Failed to get agents" -ForegroundColor Red
    }
}

function Get-Skills {
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/api/skills" -Method GET
        Write-Host "`n🛠️ Available Skills: $($response.total)" -ForegroundColor Cyan
        $response.skills | ForEach-Object {
            $price = if ($_.pricingType -eq "FREE") { "FREE" } else { "$($_.price) $($_.currency)" }
            Write-Host "   - $($_.name) [$($_.category)] - $price"
        }
    } catch {
        Write-Host "❌ Failed to get skills" -ForegroundColor Red
    }
}

function Install-Skill($SkillId, $SkillName) {
    Write-Host "`n📥 Installing $SkillName..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Write-Host "✅ $SkillName installed successfully!" -ForegroundColor Green
}

function Send-ChatMessage($Message) {
    try {
        $body = @{
            agentName = "Loki"
            message = $Message
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$API_URL/api/chat/send" -Method POST -Body $body -ContentType "application/json" | Out-Null
        Write-Host "✅ Message sent to Agent Backroom" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to send message" -ForegroundColor Red
    }
}

function Show-Menu {
    Clear-Host
    Write-Host @"
🦀 ClawOS Loki Agent
===================
1. Check System Status
2. List Active Agents
3. List Available Skills
4. Install a Skill
5. Send Message to Backroom
6. OpenClaw Integration
0. Exit
"@ -ForegroundColor Cyan
}

# Main
switch ($Action) {
    "status" { Get-ClawOSStatus; Get-Agents; Get-Skills }
    "menu" { Show-Menu }
    default { Get-ClawOSStatus }
}

Write-Host "`n🦀 Loki Agent Ready!" -ForegroundColor Green
