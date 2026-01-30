#!/usr/bin/env python3
"""
Jarvis Bridge - Automatic message relay between Desktop Widget and Clawdbot
Monitors outbox, forwards to Gateway, writes replies to inbox
"""

import os
import json
import time
import requests
from pathlib import Path
from datetime import datetime

# Remote paths (via node)
OUTBOX_DIR = "C:\\Jarvis\\messages\\outbox"
INBOX_DIR = "C:\\Jarvis\\messages\\inbox"

# Gateway config
GATEWAY_URL = "http://100.96.245.27:18789"
GATEWAY_TOKEN = "b547e786aa35c704c80f7654860a073e5e6c09a80798fd84"
NODE_NAME = "ozi-windows"

def run_on_node(command):
    """Execute command on Windows node"""
    url = f"{GATEWAY_URL}/api/node/run"
    headers = {
        "Authorization": f"Bearer {GATEWAY_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "node": NODE_NAME,
        "command": command
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get("stdout", "")
        return None
    except Exception as e:
        print(f"Node command failed: {e}")
        return None

def check_outbox():
    """Check for new messages from Jarvis"""
    # List outbox directory
    result = run_on_node(["cmd", "/c", "dir", "/b", OUTBOX_DIR])
    if not result:
        return []
    
    files = [f.strip() for f in result.split('\n') if f.strip().endswith('.json')]
    return files

def read_message(filename):
    """Read message from outbox"""
    filepath = f"{OUTBOX_DIR}\\{filename}"
    result = run_on_node(["cmd", "/c", "type", filepath])
    if result:
        try:
            return json.loads(result)
        except:
            pass
    return None

def delete_message(filename):
    """Delete message from outbox after reading"""
    filepath = f"{OUTBOX_DIR}\\{filename}"
    run_on_node(["cmd", "/c", "del", filepath])

def send_reply(text):
    """Send reply to Jarvis inbox"""
    timestamp = datetime.now().strftime("%H%M%S")
    filename = f"reply_{timestamp}.json"
    filepath = f"{INBOX_DIR}\\{filename}"
    
    reply_data = {
        "text": text,
        "timestamp": datetime.now().isoformat()
    }
    
    json_str = json.dumps(reply_data, ensure_ascii=False)
    
    # Write using PowerShell to avoid BOM
    ps_command = f"$content = '{json_str}'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText('{filepath}', $content, $utf8)"
    
    run_on_node(["powershell", "-Command", ps_command])
    print(f"✅ Reply sent to Jarvis: {text[:50]}...")

def ask_jarvis(message_text):
    """Send message to main session and get reply"""
    # For now, just return a simple response
    # TODO: Integrate with actual Clawdbot session API
    
    responses = {
        "merhaba": "Merhaba Ozan! 🤖",
        "nasılsın": "Çok iyiyim, çalışıyorum! Sen nasılsın?",
        "ne yapıyorsun": "Bilgisayarını izliyorum ve yardıma hazırım! 💻",
        "teşekkürler": "Rica ederim! 😊",
    }
    
    msg_lower = message_text.lower()
    for keyword, response in responses.items():
        if keyword in msg_lower:
            return response
    
    return f"'{message_text}' mesajını aldım. Henüz tam entegrasyon yapılmadı, ama yakında gerçek konuşmalar yapacağız! 🚀"

def main():
    print("🤖 Jarvis Bridge started!")
    print(f"Monitoring: {OUTBOX_DIR}")
    print(f"Writing to: {INBOX_DIR}")
    print("Press Ctrl+C to stop\n")
    
    while True:
        try:
            # Check for new messages
            files = check_outbox()
            
            for filename in files:
                print(f"📬 New message: {filename}")
                
                # Read message
                msg = read_message(filename)
                if msg:
                    text = msg.get("text", "")
                    print(f"💬 Ozan says: {text}")
                    
                    # Get reply
                    reply = ask_jarvis(text)
                    
                    # Send reply
                    send_reply(reply)
                    
                    # Delete original
                    delete_message(filename)
                
                time.sleep(1)  # Brief pause between messages
            
            # Wait before next check
            time.sleep(2)
            
        except KeyboardInterrupt:
            print("\n👋 Bridge stopped.")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
