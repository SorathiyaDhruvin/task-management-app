from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    GMAIL_CLIENT_ID = os.environ.get('GMAIL_CLIENT_ID')
    GMAIL_CLIENT_SECRET = os.environ.get('GMAIL_CLIENT_SECRET')
    GMAIL_REFRESH_TOKEN = os.environ.get('GMAIL_REFRESH_TOKEN')
    GMAIL_SENDER_EMAIL = os.environ.get('GMAIL_SENDER_EMAIL')
    
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
