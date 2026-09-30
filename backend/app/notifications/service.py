import logging
import threading
from app.notifications.gmail import send_email

def send_email_async(to, subject, body):
    thread = threading.Thread(target=send_email, args=(to, subject, body))
    thread.start()

def send_task_created_email(assignee_email, assignee_name, task):
    subject = f"New Task Assigned: {task['title']}"
    body = f"""Hello {assignee_name},

You have been assigned a new task.

Task:
{task['title']}

Description:
{task.get('description', 'No description')}

Priority:
{task['priority']}

Due Date:
{task.get('due_date', 'Not set')}

Please login to the Task Management application to view the task.

Thanks,
Task Management Team"""

    send_email_async(assignee_email, subject, body)


def send_task_completed_email(creator_email, creator_name, completer_name, task):
    subject = f"Task Completed: {task['title']}"
    body = f"""Hello {creator_name},

The following task has been completed:

Task:
{task['title']}

Completed by:
{completer_name}

Completed at:
{task['completed_at']}

Thanks,
Task Management Team"""

    send_email_async(creator_email, subject, body)
