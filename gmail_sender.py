import os
import base64
from email.mime.text import MIMEText
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import json

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_service():
    """Gmail API servisini oluştur"""
    creds = None
    token_path = r'C:\Jarvis\token.json'
    
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                r'C:\Jarvis\credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    
    return build('gmail', 'v1', credentials=creds)

def send_email(to, subject, body):
    """Mail gönder"""
    try:
        service = get_service()
        
        message = MIMEText(body, 'plain', 'utf-8')
        message['to'] = to
        message['subject'] = subject
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        send_message = service.users().messages().send(
            userId='me', 
            body={'raw': raw_message}
        ).execute()
        
        return f"✅ Mail gönderildi! ID: {send_message['id']}"
    
    except Exception as e:
        return f"❌ Hata: {str(e)}"

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 4:
        print("Kullanım: python gmail_sender.py <to> <subject> <body>")
        sys.exit(1)
    
    to = sys.argv[1]
    subject = sys.argv[2]
    body = sys.argv[3]
    
    result = send_email(to, subject, body)
    print(result)
