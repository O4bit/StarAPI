# StarAPI

This is my silly JS (I'm gonna kms) project called StarAPI. It provides various endpoints for system information, health checks, and more. Also comes with a Discordbot :p

## Features

- **Secure Authentication**: JWT token-based authentication with encryption
- **System Monitoring**: Real-time metrics for CPU, memory, disk, and network
- **Discord Bot Integration**: Monitor your system through Discord commands
- **Comprehensive Logging**: System, error, and audit logging
- **Role-based Access Control**: Secure API endpoints with role permissions

## Prerequisites

- Node.js 18+
- PostgreSQL (or Heroku Postgres for cloud deployment)
- Basic Linux knowledge
- Git

## Heroku Deployment

### Quick Deploy
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Manual Deployment

1. **Install Heroku CLI** and login:
   ```bash
   heroku login
   ```

2. **Create a new Heroku app**:
   ```bash
   heroku create your-starapi-app
   ```

3. **Add Heroku Postgres addon**:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

4. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=$(openssl rand -hex 32)
   heroku config:set ENCRYPTION_KEY=$(openssl rand -hex 32)
   heroku config:set BOT_SECRET=$(openssl rand -hex 16)
   heroku config:set BOT_SECRETV2=$(openssl rand -hex 32)
   heroku config:set DISCORD_TOKEN=your_discord_bot_token
   heroku config:set CLIENT_ID=your_discord_client_id
   heroku config:set DISCORD_ADMIN_IDS=your_discord_user_id
   ```

5. **Deploy the application**:
   ```bash
   git push heroku main
   ```

6. **Scale the dynos**:
   ```bash
   heroku ps:scale web=1 worker=1
   ```

7. **View logs**:
   ```bash
   heroku logs --tail
   ```

### Environment Variables for Heroku

Required environment variables:
- `DATABASE_URL` (automatically set by Heroku Postgres)
- `NODE_ENV=production`
- `JWT_SECRET` (32-byte hex string)
- `ENCRYPTION_KEY` (32-byte hex string)
- `DISCORD_TOKEN` (Discord bot token)
- `CLIENT_ID` (Discord application client ID)
- `BOT_SECRET` (Bot authentication secret)
- `BOT_SECRETV2` (Bot API token)

Optional:
- `DISCORD_ADMIN_IDS` (Comma-separated Discord user IDs)
- `FRONTEND_URL` (Frontend application URL)
- `ADMIN_PASSWORD` (Custom admin password, otherwise random)

## Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/O4bit/StarAPI.git
   cd StarAPI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the PostgreSQL database:
   ```bash
   # Login as postgres user
   sudo su - postgres
   
   # Access PostgreSQL CLI
   psql
   ```

   Then create the database and tables:
   ```sql
   CREATE DATABASE starapi;
   \c starapi
   
   CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       username VARCHAR(255) UNIQUE NOT NULL,
       password_hash VARCHAR(255) NOT NULL,
       roles TEXT[] NOT NULL DEFAULT '{user}'
   );
   
   CREATE TABLE user_tokens (
       token_id UUID PRIMARY KEY,
       user_id INTEGER REFERENCES users(id),
       expires_at TIMESTAMP NOT NULL,
       revoked BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE TABLE bot_tokens (
       bot_id VARCHAR(50) PRIMARY KEY,
       token TEXT NOT NULL,
       expires_at TIMESTAMP NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. Create a `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3030
   NODE_ENV=development
   
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/starapi
   
   # Security
   JWT_SECRET=your_jwt_secret_key
   ENCRYPTION_KEY=32_byte_hex_encryption_key
   
   # Discord Bot
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   DISCORD_ADMIN_IDS=discord_user_id1,discord_user_id2
   VERIFIED_ROLE_ID=discord_role_id
   
   # Bot Authentication
   BOT_SECRET=your_bot_secret
   BOT_SECRETV2=your_bot_secret_v2
   ```

5. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate and get token
- `POST /api/auth/logout` - Invalidate current token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/users` - Create new user (admin only)
- `POST /api/auth/bot-token` - Generate bot token

### System
- `GET /api/system/health` - Basic health check and uptime
- `GET /api/system/metrics` - Detailed system metrics (CPU, memory, disk, network)
- `GET /api/system/info` - System information (OS, CPU, hardware details)
- `GET /api/system/network` - Network interfaces and statistics
- `POST /api/system/commands` - Execute system commands (admin only)

### Logs
- `GET /api/logs` - Retrieve system logs with filtering options
- `GET /api/logs/audit` - Access audit logs (admin only)

## Discord Bot Commands

- `/status` - Display current system status
- `/metrics` - Show detailed system metrics
- `/logs [severity] [hours]` - View recent logs (admin/verified only)
- `/reboot` - Reboot the system (admin only)
- `/system-info` - Show detailed system information
- `/network-info` - Display network interface details

## Security Features

- Encrypted JWT tokens using AES-256-GCM
- Database token validation and revocation
- Role-based access control for API endpoints
- Comprehensive audit logging
- Rate limiting to prevent brute force attacks

## Development

Run in development mode with auto-restart:
```bash
npm run dev
```

Run the Discord bot separately:
```bash
npm run bot
```

## Troubleshooting

### Heroku Issues
- Check logs: `heroku logs --tail`
- Restart app: `heroku restart`
- Check dyno status: `heroku ps`
- View config: `heroku config`

### Database Issues
- Reset database: `heroku pg:reset DATABASE_URL`
- Run setup again: `heroku run npm run setup-heroku`