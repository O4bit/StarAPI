# StarAPI

This is my silly JS (I'm gonna kms) project called StarAPI. It provides various endpoints for system information, health checks, and more. Also comes with a Discordbot :p

## Features

- **Secure Authentication**: Encrypted token-based authentication
- **System Monitoring**: Real-time metrics for CPU, memory, disk, and temperature
- **Dashboard**: Interactive web dashboard for system metrics visualization
- **Discord Bot**: Command-based monitoring through Discord
- **Audit Logging**: Comprehensive tracking of all system operations
- **Rate Limiting**: Protection against brute force and DoS attacks

## Security Features

- Encrypted authentication tokens (AES-256-GCM)
- IP-based rate limiting for API endpoints
- Role-based access control
- Audit logging of all administrative actions
- No direct command execution - only pre-defined whitelisted commands
- Database-stored token verification

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Discord Bot Token (for Discord integration)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/O4bit/StarAPI.git
   cd StarAPI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file based on `.env.example` with your configuration

4. Run the setup script:
   ```bash
   npm run setup
   ```

5. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Port for the API server (default: 3000) | No |
| `NODE_ENV` | Environment (`development`, `production`) | Yes |
| `DB_HOST` | PostgreSQL database host | Yes |
| `DB_PORT` | PostgreSQL database port | No |
| `DB_NAME` | PostgreSQL database name | Yes |
| `DB_USER` | PostgreSQL database user | Yes |
| `DB_PASSWORD` | PostgreSQL database password | Yes |
| `JWT_SECRET` | Secret for signing JWT tokens | Yes |
| `ENCRYPTION_KEY` | 32-byte hex key for token encryption | Yes |
| `FRONTEND_URL` | URL of the frontend application (CORS) | Yes |
| `DISCORD_TOKEN` | Discord bot token | For Discord bot |
| `CLIENT_ID` | Discord client ID | For Discord bot |
| `DISCORD_ADMIN_IDS` | Discord user IDs with admin access | For Discord bot |

## Documentation

### API Endpoints

#### Authentication
- `POST /api/auth/login` - Authenticate and receive a token
- `POST /api/auth/logout` - Invalidate current token
- `GET /api/auth/me` - Get current user info

#### System Monitoring
- `GET /api/system/health` - Basic system health information
- `GET /api/system/metrics` - Detailed system metrics
- `GET /api/system/metrics/history` - Historical metrics data

#### Logs
- `GET /api/logs` - Retrieve system logs
- `GET /api/logs/audit` - Retrieve audit logs

### Dashboard

The dashboard is available at `http://localhost:3000` (or your configured URL) after starting the server.

### Discord Commands

- `/status` - Show current system status
- `/metrics` - Display detailed system metrics
- `/logs [severity] [hours]` - Show recent logs (admin only)
- `/reboot` - Reboot the system (admin only)

## Development

### Running in Development Mode

```bash
npm run dev
```

### Running the Bot Separately

```bash
npm run bot
```

## License

MIT