# Task Management App

A simple, robust task management application built as part of an internship assignment.

**Live URL**: `[Placeholder for Live URL]`

## Overview
This is a monorepo containing:
- **Backend**: Python Flask API
- **Frontend**: Next.js App Router (TypeScript, Tailwind CSS)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Google OAuth 2.0 (Gmail accounts)
- **Email Notifications**: Gmail API

## Architecture
```
+-------------+       +---------------+       +------------------+
|   Browser   | <---> | Next.js (FE)  | <---> | Flask (Backend)  |
+-------------+       +---------------+       +------------------+
                                                      |
                                                      v
                                              +------------------+
                                              | Supabase (DB)    |
                                              +------------------+
                                                      |
                                        +--------------------------+
                                        | Google Services (OAuth,  |
                                        | Gmail API)               |
                                        +--------------------------+
```

### Auth Flow
1. **Frontend**: "Sign in with Google" button links to `GET /auth/google/login` on the Flask backend.
2. **Google OAuth**: Redirects to `GET /auth/google/callback` on the backend.
3. **Backend**: Fetches the user's details, upserts them into the Supabase `users` table, creates a signed JWT (7-day expiry), and redirects to `{FRONTEND_URL}/auth/callback?token=<jwt>`.
4. **Frontend**: Extracts the token, stores it in `localStorage`, and sends it as `Authorization: Bearer <token>` in subsequent API requests.

### Database Schema
- **users**:
  - `id`: UUID (Primary Key)
  - `email`: TEXT (Unique)
  - `name`: TEXT
  - `avatar_url`: TEXT
  - `created_at`: TIMESTAMP

- **tasks**:
  - `id`: UUID (Primary Key)
  - `title`: TEXT
  - `description`: TEXT
  - `status`: TEXT ('pending' | 'completed')
  - `created_by`: UUID (Foreign Key to users.id)
  - `assigned_to`: UUID (Foreign Key to users.id)
  - `due_date`: TIMESTAMP
  - `created_at`: TIMESTAMP
  - `completed_at`: TIMESTAMP

### API Endpoints
- `GET /health` - Health check.
- `GET /auth/google/login` - Initiate Google OAuth.
- `GET /auth/google/callback` - Handle Google OAuth callback.
- `GET /api/me` - Get current user profile.
- `GET /api/users` - List all users.
- `POST /api/tasks` - Create a task.
- `GET /api/tasks` - List tasks (supports `?view=assigned|created|all`).
- `PATCH /api/tasks/<id>/complete` - Mark a task as complete.
- `DELETE /api/tasks/<id>` - Delete a task.

## Local Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd task-management-app
   ```

2. **Database (Supabase)**:
   - Create a project on [Supabase](https://supabase.com/).
   - Execute the SQL migrations located in `/migrations` via the Supabase SQL editor.
   - Note the Database URL and Service Role Key for the `.env` file.

3. **Google Cloud OAuth & Gmail Setup**:
   - Go to Google Cloud Console, create a new project.
   - Enable the **Google Drive API** (optional) and **Gmail API**.
   - Configure the OAuth Consent Screen (add yourself as a Test User).
   - Create OAuth 2.0 Client IDs (Web Application).
   - Add Authorized Redirect URIs: `http://localhost:5000/auth/google/callback`.
   - Run the script `python backend/scripts/get_gmail_refresh_token.py` (to be created in Phase 4) locally to get the `GMAIL_REFRESH_TOKEN`.

4. **Environment Variables**:
   - Copy `.env.example` to `.env` in the root folder and fill in the values.

5. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   python app.py
   ```

6. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Deployment
- **Frontend**: Deploy on [Vercel](https://vercel.com/) by connecting this repository and pointing the root directory to `frontend/`. Add environment variables in the Vercel dashboard.
- **Backend**: Deploy on [Render](https://render.com/) or [Railway](https://railway.app/). Point to the `backend/` directory and use `gunicorn` as the WSGI server. Add environment variables in the dashboard.
- **Database**: Hosted on Supabase.
