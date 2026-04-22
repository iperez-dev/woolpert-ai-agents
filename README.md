# Woolpert AI Agents Hub (MERN)

This project is a MERN CRUD app that acts as a central repository for Woolpert AI agents.

## Features

- Browse all AI agents in a card-based dashboard.
- Open hosted agent links and optional documentation links.
- Allowed users can create, edit, and delete agents.
- Any user can request a new agent idea that is not yet listed.
- SpaceX-inspired dark mission-control visual style (currently black background; ready for a future background video).

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose

## Setup

### 1) Start MongoDB

Run a local MongoDB instance or use MongoDB Atlas.

### 2) Configure backend env

Copy `server/.env.example` to `server/.env` and update values:

```bash
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/woolpert-agents
CLIENT_URL=http://localhost:5173
ALLOWED_UPLOADERS=person1@woolpert.com,person2@woolpert.com
```

### 3) Run backend

```bash
cd server
npm install
npm run dev
```

### 4) Run frontend

```bash
cd client
npm install
npm run dev
```

Frontend defaults to `http://localhost:5173` and API defaults to `http://localhost:5000`.

To override API URL, set `VITE_API_BASE_URL` in `client/.env`.
