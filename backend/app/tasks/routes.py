from flask import Blueprint, request, g
from app.auth.middleware import require_auth
from app.utils.responses import success_response, error_response
from app.extensions import supabase
from app.notifications.service import send_task_created_email, send_task_completed_email
from datetime import datetime
import logging

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('', methods=['GET'])
@require_auth
def list_tasks():
    status = request.args.get('status')
    priority = request.args.get('priority')
    assigned_to = request.args.get('assigned_to')
    created_by = request.args.get('created_by')
    parent_id = request.args.get('parent_id')
    
    try:
        query = supabase.table('tasks').select('*, created_by_profile:profiles!tasks_created_by_fkey(*), assigned_to_profile:profiles!tasks_assigned_to_fkey(*)')
        
        if status:
            query = query.eq('status', status)
        if priority:
            query = query.eq('priority', priority)
        if assigned_to:
            query = query.eq('assigned_to', assigned_to)
        if created_by:
            query = query.eq('created_by', created_by)
        if parent_id is not None:
            if parent_id.lower() == 'none' or parent_id.lower() == 'null':
                query = query.is_('parent_id', 'null')
            else:
                query = query.eq('parent_id', parent_id)
            
        # Optional: restrict to user's authorized tasks (e.g., created by or assigned to them)
        # But per requirements: "A user can see tasks they created, see tasks assigned to them".
        # We can enforce this here by adding an OR filter.
        query = query.or_(f"created_by.eq.{g.user_id},assigned_to.eq.{g.user_id}")

        response = query.order('created_at', desc=True).execute()
        return success_response(response.data)
    except Exception as e:
        logging.error(f"Error listing tasks: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)

@tasks_bp.route('/<task_id>', methods=['GET'])
@require_auth
def get_task(task_id):
    try:
        response = supabase.table('tasks').select('*, created_by_profile:profiles!tasks_created_by_fkey(*), assigned_to_profile:profiles!tasks_assigned_to_fkey(*)').eq('id', task_id).execute()
        if not response.data:
            return error_response('NOT_FOUND', 'Task not found', 404)
            
        task = response.data[0]
        if task['created_by'] != g.user_id and task['assigned_to'] != g.user_id:
            return error_response('FORBIDDEN', 'You are not authorized to view this task', 403)
            
        return success_response(task)
    except Exception as e:
        logging.error(f"Error getting task: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)

@tasks_bp.route('', methods=['POST'])
@require_auth
def create_task():
    data = request.json
    title = data.get('title')
    description = data.get('description')
    priority = data.get('priority', 'medium')
    assigned_to = data.get('assigned_to')
    due_date = data.get('due_date')
    parent_id = data.get('parent_id')
    
    if not title:
        return error_response('VALIDATION_ERROR', 'Title is required', 400)
    if priority not in ['low', 'medium', 'high']:
        return error_response('VALIDATION_ERROR', 'Invalid priority', 400)
    if not assigned_to:
        return error_response('VALIDATION_ERROR', 'Assigned user is required', 400)
        
    try:
        # Verify assigned user exists
        user_resp = supabase.table('profiles').select('email, full_name').eq('id', assigned_to).execute()
        if not user_resp.data:
            return error_response('VALIDATION_ERROR', 'Assigned user does not exist', 400)
            
        assignee = user_resp.data[0]

        task_data = {
            'title': title,
            'description': description,
            'priority': priority,
            'assigned_to': assigned_to,
            'created_by': g.user_id,
        }
        if due_date:
            task_data['due_date'] = due_date
        if parent_id:
            task_data['parent_id'] = parent_id

        response = supabase.table('tasks').insert(task_data).execute()
        created_task = response.data[0]

        # Send Email Notification
        send_task_created_email(
            assignee_email=assignee['email'], 
            assignee_name=assignee.get('full_name', 'User'), 
            task=created_task
        )
        
        return success_response(created_task, 201)
    except Exception as e:
        logging.error(f"Error creating task: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)

@tasks_bp.route('/<task_id>', methods=['PATCH'])
@require_auth
def update_task(task_id):
    data = request.json
    allowed_fields = ['title', 'description', 'priority', 'assigned_to', 'due_date', 'status']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        return error_response('VALIDATION_ERROR', 'No valid fields provided to update', 400)
        
    try:
        task_resp = supabase.table('tasks').select('*').eq('id', task_id).execute()
        if not task_resp.data:
            return error_response('NOT_FOUND', 'Task not found', 404)
            
        task = task_resp.data[0]
        # Only creator or assigned user can update
        if task['created_by'] != g.user_id and task['assigned_to'] != g.user_id:
            return error_response('FORBIDDEN', 'You are not authorized to update this task', 403)
            
        response = supabase.table('tasks').update(update_data).eq('id', task_id).execute()
        return success_response(response.data[0])
    except Exception as e:
        logging.error(f"Error updating task: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)

@tasks_bp.route('/<task_id>/complete', methods=['POST'])
@require_auth
def complete_task(task_id):
    try:
        task_resp = supabase.table('tasks').select('*, created_by_profile:profiles!tasks_created_by_fkey(*)').eq('id', task_id).execute()
        if not task_resp.data:
            return error_response('NOT_FOUND', 'Task not found', 404)
            
        task = task_resp.data[0]
        if task['created_by'] != g.user_id and task['assigned_to'] != g.user_id:
            return error_response('FORBIDDEN', 'You are not authorized to complete this task', 403)
            
        if task['status'] == 'completed':
            return error_response('VALIDATION_ERROR', 'Task is already completed', 400)
            
        now_str = datetime.utcnow().isoformat()
        response = supabase.table('tasks').update({
            'status': 'completed',
            'completed_at': now_str
        }).eq('id', task_id).execute()
        
        updated_task = response.data[0]
        creator = task.get('created_by_profile', {})
        
        # Get completer info (the current user)
        me_resp = supabase.table('profiles').select('full_name').eq('id', g.user_id).execute()
        completer_name = me_resp.data[0].get('full_name', 'User') if me_resp.data else 'User'

        if creator and creator.get('email'):
            send_task_completed_email(
                creator_email=creator['email'],
                creator_name=creator.get('full_name', 'User'),
                completer_name=completer_name,
                task=updated_task
            )
            
        return success_response(updated_task)
    except Exception as e:
        logging.error(f"Error completing task: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)

@tasks_bp.route('/<task_id>', methods=['DELETE'])
@require_auth
def delete_task(task_id):
    try:
        task_resp = supabase.table('tasks').select('created_by').eq('id', task_id).execute()
        if not task_resp.data:
            return error_response('NOT_FOUND', 'Task not found', 404)
            
        if task_resp.data[0]['created_by'] != g.user_id:
            return error_response('FORBIDDEN', 'Only the creator can delete this task', 403)
            
        supabase.table('tasks').delete().eq('id', task_id).execute()
        return success_response({"message": "Task deleted successfully"})
    except Exception as e:
        logging.error(f"Error deleting task: {e}")
        return error_response('INTERNAL_ERROR', 'An error occurred', 500)
