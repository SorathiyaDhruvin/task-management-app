from flask import Blueprint, request
from app.auth.middleware import require_auth
from app.utils.responses import success_response, error_response
from app.extensions import supabase
import logging

users_bp = Blueprint('users', __name__)

@users_bp.route('', methods=['GET'])
@require_auth
def list_users():
    try:
        # Only return necessary info for assignment
        response = supabase.table('profiles').select('id, email, full_name, avatar_url').execute()
        return success_response(response.data)
    except Exception as e:
        logging.error(f"Error listing users: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)

@users_bp.route('/search', methods=['GET'])
@require_auth
def search_users():
    query = request.args.get('q', '')
    if not query:
        return success_response([])
        
    try:
        response = supabase.table('profiles').select('id, email, full_name, avatar_url')\
            .or_(f"email.ilike.%{query}%,full_name.ilike.%{query}%").execute()
        return success_response(response.data)
    except Exception as e:
        logging.error(f"Error searching users: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)
