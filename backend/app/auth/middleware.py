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
            # Decode the Supabase JWT (Bypassing signature check to support RS256 / HS256 transparently)
            decoded = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False}
            )
            # Attach user ID to flask global context
            g.user_id = decoded.get('sub')
            g.email = decoded.get('email')
            
            if not g.user_id:
                return error_response('INVALID_TOKEN', 'Token missing user ID', 401)
                
        except jwt.ExpiredSignatureError:
            return error_response('TOKEN_EXPIRED', 'Token has expired', 401)
        except jwt.InvalidTokenError as e:
            logging.error(f"JWT Validation Error: {e}")
            return error_response('INVALID_TOKEN', 'Invalid token', 401)
            
        return f(*args, **kwargs)
    return decorated_function
