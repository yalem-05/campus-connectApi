# Campus Connect API

A backend API for a School Management System built with Express, TypeScript, PostgreSQL, and JWT authentication.

## Overview

The Campus Connect API provides user authentication and profile management for Admin, Student, Faculty, and Staff roles. It initializes a PostgreSQL database on startup, creates required tables, and seeds default data.

## Features

- Register new users with role-based support
- Login with email and password
- JWT token authentication
- Protected profile endpoint
- Login history tracking
- Database initialization and table creation on startup

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- bcryptjs
- jsonwebtoken
- zod
- cors
- dotenv

## Requirements

- Node.js 18+ / 20+
- PostgreSQL database

## Setup

1. Copy or create a `.env` file in the project root.

2. Configure the database and JWT values:

##```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sms
DB_USER=postgres

```

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - start the app with `tsx` in watch mode
- `npm run build` - compile TypeScript to `dist`
- `npm start` - start the compiled app from `dist`

## API Endpoints

### Health Check

`GET /api/health`

Response:

```json
{
  "status": "ok",
  "message": "School Management System API is running"
}
```

### Register User

`POST /api/auth/register`

Request body:

```json
{
  "username": "jdoe",
  "email": "jdoe@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Student"
}
```

Successful response includes user data and a JWT token.

### Login User

`POST /api/auth/login`

Request body:

```json
{
  "email": "jdoe@example.com",
  "password": "password123"
}
```

Successful response includes user data and a JWT token.

### Get Profile

`GET /api/auth/profile`

Headers:

```http
Authorization: Bearer <token>
```

Returns authenticated user profile data.

### Get Login History

`GET /api/auth/history`

Headers:

```http
Authorization: Bearer <token>
```

Returns up to 10 recent login history records.

### Logout

`POST /api/auth/logout`

Headers:

```http
Authorization: Bearer <token>
```

Returns a logout confirmation message.

## Environment Variables

- `PORT` - server port (default: `3001`)
- `DB_HOST` - PostgreSQL host (default: `localhost`)
- `DB_PORT` - PostgreSQL port (default: `5432`)
- `DB_NAME` - database name (default: `sms`)
- `DB_USER` - database user (default: `postgres`)
- `DB_PASSWORD` - database password (default: `1234`)
- `JWT_SECRET` - secret used to sign JWT tokens

## Notes

- The project automatically initializes the PostgreSQL database and creates tables at startup.
- Default seeded data is added when the server starts.
- For production, update `JWT_SECRET` and database credentials to secure values.

## Project Structure

- `src/index.ts` - application entry point
- `src/routes/auth.ts` - authentication routes
- `src/controllers/authController.ts` - auth controller logic
- `src/middleware/auth.ts` - JWT auth middleware
- `src/config/database.ts` - PostgreSQL connection and schema setup
- `src/types/index.ts` - shared TypeScript types
