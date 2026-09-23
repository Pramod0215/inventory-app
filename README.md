# Inventory App

A full-stack inventory management application with a React frontend and Express + MongoDB backend.

## Features

- User login and signup pages
- JWT-based authentication
- MongoDB database integration
- Docker support for frontend, backend, and MongoDB
- Single-command local development via `npm run dev`

## Local setup

1. Install dependencies:
   - `npm install`
   - `npm --prefix clientapp install`
   - `npm --prefix backend install`
2. Start the app:
   - `npm run dev`

## Docker setup

```bash
npm run docker:up
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:5000`.

## Project structure

```text
inventory-app/
├── backend/
├── clientapp/
├── docker-compose.yml
├── package.json
└── README.md
```
