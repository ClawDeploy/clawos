#!/bin/bash
# Bulk Email Generator for Mail.tm
# Usage: ./generate_emails.sh [count]

COUNT=${1:-5}
DOMAIN="virgilian.com"
PASSWORD="Birbs2026!Secure"

echo "Generating ${COUNT} email accounts..."
echo "================================"

for i in $(seq 1 $COUNT); do
    USERNAME="birbs$(date +%s | sha256sum | head -c 8)$(openssl rand -hex 2)"
    EMAIL="${USERNAME}@${DOMAIN}"
    
    # Create account
    RESULT=$(curl -s -X POST https://api.mail.tm/accounts \
        -H "Content-Type: application/json" \
        -d "{\"address\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" 2>&1)
    
    if echo "$RESULT" | grep -q "address"; then
        echo "✅ $EMAIL"
        echo "$EMAIL" >> emails_list.txt
    else
        echo "❌ Failed to create: $EMAIL"
        echo "Error: $RESULT"
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.5
done

echo "================================"
echo "Total accounts created: $(wc -l < emails_list.txt)"
echo "Password for all accounts: $PASSWORD"
echo "Email list saved to: emails_list.txt"
