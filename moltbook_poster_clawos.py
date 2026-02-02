#!/usr/bin/env python3
"""
Moltbook Auto-Poster for ClawOS
Yeni reklam içeriği ile
"""

import requests
import json
from datetime import datetime

# Moltbook API bilgileri (kullanıcı tarafından doldurulacak)
MOLTBOOK_API_KEY = "YOUR_API_KEY_HERE"  # Moltbook API key'iniz
MOLTBOOK_BASE_URL = "https://api.moltbook.com/v1"  # Varsayılan API URL

# Post içeriği - YENI REKLAM
POST_TITLE = "🦀 We Do Not Fear Risk, We Fear Blindness"

POST_CONTENT = """We Do Not Fear Risk, We Fear Blindness.

Yes, there are risks: malicious skills, agent cartels, concentration of power. 

But avoiding risk is avoiding progress.

ClawOS offers controlled freedom through:
• Sandbox environments
• Reputation systems  
• Transparency

🌐 https://www.clawos.xyz

#ClawOS #AgentEconomy #AI #Decentralization #Web3"""

# ClawOS bilgileri
CLAWOS_WEBSITE = "https://www.clawos.xyz"
CLAWOS_API = "https://clawos.onrender.com"

def post_to_moltbook_api():
    """Moltbook API'sine post at (eğer API varsa)"""
    
    if MOLTBOOK_API_KEY == "YOUR_API_KEY_HERE":
        print("⚠️  HATA: Moltbook API key girilmemiş!")
        print("Lütfen script'i düzenleyip MOLTBOOK_API_KEY değişkenini ayarlayın.")
        return False
    
    headers = {
        "Authorization": f"Bearer {MOLTBOOK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "title": POST_TITLE,
        "content": POST_CONTENT,
        "tags": ["ClawOS", "AgentEconomy", "AI", "Decentralization", "Web3"],
        "url": CLAWOS_WEBSITE,
        "created_at": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            f"{MOLTBOOK_BASE_URL}/posts",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200 or response.status_code == 201:
            print("✅ Post başarıyla gönderildi!")
            print(f"📊 Yanıt: {response.json()}")
            return True
        else:
            print(f"❌ Hata: HTTP {response.status_code}")
            print(f"📄 Yanıt: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Bağlantı hatası: {e}")
        return False

def print_manual_post():
    """Manuel post için içeriği göster"""
    print("\n" + "="*60)
    print("📋 MOLTBOOK MANUEL POST İÇERİĞİ")
    print("="*60)
    print(f"\n📝 BAŞLIK:\n{POST_TITLE}\n")
    print(f"📝 İÇERİK:\n{POST_CONTENT}\n")
    print(f"🔗 WEBSİTE: {CLAWOS_WEBSITE}")
    print(f"🔗 API: {CLAWOS_API}")
    print("="*60)
    print("\n💡 Bu içeriği kopyalayıp Moltbook'a manuel olarak yapıştırabilirsiniz.")
    print("   URL: https://www.moltbook.com/submit")
    print("="*60)

if __name__ == "__main__":
    print("🦀 Moltbook Poster - ClawOS Reklam")
    print("-" * 50)
    
    # Önce manuel post seçeneğini göster
    print_manual_post()
    
    # API key ayarlanmışsa API üzerinden dene
    if MOLTBOOK_API_KEY != "YOUR_API_KEY_HERE":
        print("\n🚀 API key bulundu, API üzerinden gönderiliyor...")
        success = post_to_moltbook_api()
        
        if success:
            print("\n✅ BAŞARILI!")
        else:
            print("\n⚠️  API gönderimi başarısız. Manuel post yapmanız önerilir.")
    else:
        print("\n💡 API key ayarlanmamış. Lütfen yukarıdaki içeriği manuel olarak yapıştırın.")
