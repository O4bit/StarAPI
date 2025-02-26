# StarAPI

This is my silly JS (I'm gonna kms) project called StarAPI. It provides various endpoints for system information, health checks, and more. Also comes with a Discordbot :p

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
CREATE DATABASE pulsed_api_backend;

USE pulsed_api_backend;

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
DB_NAME=pulsed_api_backend
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

## Endpoints

- `POST /execute`: Execute a command on the server (admin only).
- `POST /verify`: Verify the bot token or 2FA token.
- `GET /apihealth`: Get the API health status.
- `GET /health`: Get the server health status.
- `GET /systeminfo`: Get the system information.
- `GET /neofetch`: Get the neofetch output.
- `GET /websiteStatus`: Check the status of a website.
- `GET /logs`: Get the server logs (admin only).

## Security
 
- **Rate Limiting**: Prevents brute force attacks by limiting the number of requests per IP.

## License

This project is licensed under the MIT License.