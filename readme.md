```markdown
# StarAPI

This is my silly project called StarAPI. It provides various endpoints for system information, health checks, and more. The API uses secure authentication including JWT, 2FA, and IP whitelisting. oh also comes with a Discordbot :p

## Prerequisites

- Node.js
- MariaDB
- Basic linux knowladge
- A brain
- Git

## Installation

1. Clone the repository:

```sh
git clone https://github.com/O4bit/StarAPI.git
cd StarAPI
```

2. Install the dependencies:

```sh
npm install
```

3. Set up the MariaDB database:

```sql
CREATE DATABASE starapi;

USE starapi;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

CREATE TABLE bot_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

4. Create a .env file with the following content:

```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=starapi
JWT_SECRET=your_jwt_secret
PASTEBIN_API_KEY=your_pastebin_api_key
PASTEBIN_USER_NAME=your_pastebin_user_name
PASTEBIN_USER_PASSWORD=your_pastebin_user_password
```

Replace the placeholders with your actual values.

## Usage

1. Start the API server:

```sh
npm start
```

2. Generate the QR code for 2FA setup:

```sh
node app.js /2fa
```

3. Generate the bot token:

```sh
node app.js /botoken
```

4. Add an IP address to the whitelist:

```sh
node app.js /whitelist <ip_address>
```

Replace `<ip_address>` with the actual IP address you want to whitelist.

## Endpoints

- `POST /register`: Register a new user.
- `POST /login`: Log in and get a JWT token.
- `POST /verify-2fa`: Verify the 2FA token.
- `POST /execute`: Execute a command on the server (admin only).
- `POST /verify`: Verify the bot token or 2FA token.
- `GET /tokens`: Get all tokens (admin only).
- `DELETE /tokens/:id`: Delete a token by ID (admin only).
- `PATCH /tokens/:id/lock`: Lock a token by ID (admin only).
- `GET /apihealth`: Get the API health status.
- `GET /health`: Get the server health status.
- `GET /systeminfo`: Get the system information.
- `GET /neofetch`: Get the neofetch output.
- `GET /websiteStatus`: Check the status of a website.
- `GET /logs`: Get the server logs (admin only).

## Security

- **JWT**: JSON Web Tokens are used for session management.
- **2FA**: Two-Factor Authentication is used for additional security.
- **IP Whitelisting**: Only whitelisted IP addresses can access sensitive endpoints.
- **Rate Limiting**: Prevents brute force attacks by limiting the number of requests per IP.

## License

This project is licensed under the MIT License.