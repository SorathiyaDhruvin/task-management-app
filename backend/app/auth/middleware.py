from functools import wraps
from flask import request, g
import jwt
from app.config import Config
from app.utils.responses import error_response
import logging

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return error_response('UNAUTHORIZED', 'Missing or invalid Authorization header', 401)
        
        token = auth_header.split(' ')[1]
        try:
            # Use Supabase SDK to verify token and get user
            from app.extensions import supabase
            user_response = supabase.auth.get_user(token)
            
            if not user_response or not user_response.user:
                return error_response('INVALID_TOKEN', 'Token missing user ID', 401)
                
            # Attach user ID to flask global context
            g.user_id = user_response.user.id
            g.email = user_response.user.email
                
        except Exception as e:
            logging.error(f"Token Validation Error: {e}")
            return error_response('INVALID_TOKEN', 'Invalid token or expired', 401)
            
        return f(*args, **kwargs)
    return decorated_function
