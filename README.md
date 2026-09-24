# IT Logbook

A web-based IT logbook application built with **React + Vite** frontend and **Node.js/Express** backend, using MySQL/MariaDB for data storage.

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## 🖥️ Overview

IT Logbook is designed to help IT teams record, track, and manage daily activities, incidents, and maintenance tasks. The frontend provides a clean, responsive interface, while the backend exposes a RESTful API for CRUD operations on log entries, users, and categories.

## ✨ Features

- User authentication (login/logout)
- Create, read, update, delete log entries
- Categorize entries (e.g., Incident, Maintenance, Request)
- Filter and search logs
- Responsive design (works on desktop and tablet)
- RESTful API with JSON responses
- MySQL/MariaDB persistence
- Docker‑ready (optional)

## 🛠️ Tech Stack

**Frontend**
- React 18
- Vite (fast build & dev server)
- React Router
- Axios (HTTP client)
- CSS Modules / Tailwind (if configured)

**Backend**
- Node.js (≥18 LTS)
- Express.js
- MySQL2 / Sequelize (or raw queries)
- JWT for authentication
- dotenv for config
- PM2 or systemd for production process management

**Database**
- MySQL 5.7+ or MariaDB 10.3+

**DevOps / Tooling**
- Git
- npm
- ESLint / Prettier (optional)

## 🔧 Prerequisites

Before you begin, ensure you have installed:

- [Node.js](https://nodejs.org/) (≥18.x)
- [npm](https://www.npmjs.com/) (comes with Node)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) or [MariaDB](https://mariadb.org/download/)
- [Git](https://git-scm.com/) (optional, for cloning)

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/it-logbook.git
cd it-logbook
```

### 2. Backend setup

```bash
# Navigate to backend folder
cd backend

# Install production dependencies
npm ci --only=production

# Copy example env and configure
cp .env.example .env   # create if not exists
# Edit .env with your MySQL credentials and other settings
```

### 3. Frontend setup

```bash
# Go back to root then to frontend
cd ../frontend

# Install dependencies
npm ci

# Build for production (optional for dev)
npm run build   # outputs to ./dist
```

## ⚙️ Environment Variables

Create a `.env` file in the `backend` directory (do **not** commit this file).

```dotenv
# Server port
PORT=5000

# CORS origin (frontend URL)
FRONTEND_URL=http://localhost:5173   # adjust for production

# MySQL connection
DB_HOST=127.0.0.1
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=it_logbook

# JWT secret (use a strong random string)
JWT_SECRET=your_super_secret_jwt_key

# Optional: session or other secrets
```

You can copy `.env.example` if provided.

## 🚀 Running the Application

### Development (with hot reload)

1. **Start backend**
   ```bash
   cd backend
   npm run dev   # if you have a dev script; otherwise: node server.js
   ```

2. **Start frontend**
   ```bash
   cd frontend
   npm run dev   # Vite dev server, usually on http://localhost:5173
   ```

The frontend will proxy API requests to the backend if configured in `vite.config.js`.

### Production

1. **Build frontend**
   ```bash
   cd frontend
   npm run build   # creates ./dist
   ```

2. **Start backend (serves static files)**
   ```bash
   cd backend
   npm start   # or use PM2/systemd as described below
   ```

#### Using PM2 (recommended)

```bash
# Install PM2 globally if not present
npm install -g pm2

# Start the app
cd backend
pm2 start server.js --name it-logbook

# Save and enable auto‑restart
pm2 save
pm2 startup   # follow the printed instructions
```

#### Using systemd

See the existing `README.md` (Linux Mint deployment) for a sample service file.

## 🗄️ Database Setup

1. Ensure MySQL/MariaDB is running.
2. Create the database and user:

```sql
CREATE DATABASE IF NOT EXISTS it_logbook;
CREATE USER 'your_db_user'@'localhost' IDENTIFIED BY 'your_db_password';
GRANT ALL PRIVILEGES ON it_logbook.* TO 'your_db_user'@'localhost';
FLUSH PRIVILEGES;
```

3. (Optional) Run any migration/seed scripts located in `backend/scripts/` or `backend/db/`.

## 🔌 API Endpoints

| Method | Endpoint               | Description                  |
|--------|------------------------|------------------------------|
| `POST` | `/api/auth/login`      | Authenticate user, returns JWT |
| `GET`  | `/api/logs`            | Get all logs (with filters)   |
| `POST` | `/api/logs`            | Create a new log entry        |
| `GET`  | `/api/logs/:id`        | Get a single log by ID        |
| `PUT`  | `/api/logs/:id`        | Update a log entry            |
| `DELETE`| `/api/logs/:id`       | Delete a log entry            |
| `GET`  | `/api/categories`      | List log categories           |
| ...    | ...                    | (see `backend/routes/` for full list) |

All protected routes require a valid JWT in the `Authorization: Bearer <token>` header.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m 'Add amazing feature'`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

Please ensure your code follows the existing style and passes any linting tests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Happy logging! 🎉* 