from flask import Blueprint, request, g
from app.auth.middleware import require_auth
from app.utils.responses import success_response, error_response
from app.extensions import supabase
import logging

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    try:
        response = supabase.table('profiles').select('*').eq('id', g.user_id).execute()
        if not response.data:
            return error_response('NOT_FOUND', 'User profile not found', 404)
        return success_response(response.data[0])
    except Exception as e:
        logging.error(f"Error fetching profile: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)

@auth_bp.route('/sync', methods=['POST'])
@require_auth
def sync_profile():
    data = request.json
    full_name = data.get('full_name')
    avatar_url = data.get('avatar_url')
    
    try:
        profile_data = {
            'id': g.user_id,
            'email': g.email,
        }
        if full_name:
            profile_data['full_name'] = full_name
        if avatar_url:
            profile_data['avatar_url'] = avatar_url
            
        # Upsert the profile
        response = supabase.table('profiles').upsert(profile_data).execute()
        return success_response(response.data[0], 201)
    except Exception as e:
        logging.error(f"Error syncing profile: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)
