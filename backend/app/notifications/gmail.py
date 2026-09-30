import base64
from email.message import EmailMessage
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import logging
from app.config import Config

def get_gmail_service():
    if not all([Config.GMAIL_CLIENT_ID, Config.GMAIL_CLIENT_SECRET, Config.GMAIL_REFRESH_TOKEN]):
        logging.warning("Gmail credentials missing. Email won't be sent.")
        return None
        
    creds = Credentials(
        token=None,
        refresh_token=Config.GMAIL_REFRESH_TOKEN,
        client_id=Config.GMAIL_CLIENT_ID,
        client_secret=Config.GMAIL_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token"
    )
    
    try:
        service = build('gmail', 'v1', credentials=creds, cache_discovery=False)
        return service
    except Exception as e:
        logging.error(f"Failed to build Gmail service: {e}")
        return None

def send_email(to, subject, body):
    service = get_gmail_service()
    if not service:
        return False
        
    message = EmailMessage()
    message.set_content(body)
    message['To'] = to
    message['From'] = Config.GMAIL_SENDER_EMAIL
    message['Subject'] = subject

    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    create_message = {'raw': encoded_message}

    try:
        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        logging.info(f"Email sent. Message ID: {send_message['id']}")
        return True
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return False
