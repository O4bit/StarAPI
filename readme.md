# P.U.L.S.E.D-API-backend

This project is a backend API for the P.U.L.S.E.D application, which includes integration with Discord and Google OAuth for user verification. It also uses PostgreSQL for storing bearer tokens.

## Prerequisites

- Node.js
- PostgreSQL
- Discord Bot Token
- Google OAuth Credentials
- Pastebin API Credentials

## Setup

1. **Clone the repository:**

    ```sh
    git clone https://github.com/O4bit/Simple-API.git
    cd Simple-API
    ```

2. **Install dependencies:**

    ```sh
    npm install
    ```

3. **Set up PostgreSQL:**

    - Install PostgreSQL and create a database and user.
    - Create a table for storing tokens:

        ```sql
        CREATE TABLE tokens (
            id SERIAL PRIMARY KEY,
            token VARCHAR(255) UNIQUE NOT NULL
        );
        ```

4. **Configure environment variables:**

    Create a `.env` file in the root directory and add the following variables:

    ```properties
    SESSION_SECRET="your_session_secret"
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"
    CALLBACK_URL="your_google_callback_url"
    DISCORD_TOKEN="your_discord_token"
    API_URL="your_api_url"
    API_TOKEN="your_api_token"
    DISCORD_CHANNEL_ID="your_discord_channel_id"
    DISCORD_WEBHOOK_URL="your_discord_webhook_url"
    PASTEBIN_API_KEY="your_pastebin_api_key"
    PASTEBIN_USER_NAME="your_pastebin_user_name"
    PASTEBIN_USER_PASSWORD="your_pastebin_user_password"
    CLIENT_ID="your_discord_client_id"
    GUILD_ID="your_discord_guild_id"
    PGUSER="your_postgresql_user"
    PGHOST="your_postgresql_host"
    PGDATABASE="your_postgresql_database"
    PGPASSWORD="your_postgresql_password"
    PGPORT="your_postgresql_port"
    VERIFIED_ROLE_ID="your_verified_role_id"
    ```

5. **Add a token to the database:**

    Create a script [addToken.js](http://_vscodecontentref_/2) to add a token to the PostgreSQL database:

    ```javascript
    require('dotenv').config();
    const { Pool } = require('pg');

    const pool = new Pool({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
    });

    const token = 'your_bearer_token';

    async function addToken() {
        try {
            await pool.query('INSERT INTO tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING', [token]);
            console.log('Token added successfully');
        } catch (error) {
            console.error('Error adding token:', error);
        } finally {
            pool.end();
        }
    }

    addToken();
    ```

    Run the script to add the token:

    ```sh
    node addToken.js
    ```

## Running the Application

1. **Start the backend server:**

    ```sh
    node app.js
    ```

2. **Start the Discord bot:**
(recommended to have discordbot on a diffrent server like aws ec2)
    ```sh
    node bot.js
    ```

## Usage

- **Google OAuth Authentication:**

    Users can authenticate using Google OAuth. The access token will be stored in the PostgreSQL database.

- **Discord Bot Commands:**

    - `/verify`: Verify your account with a bearer token.
    - `/status`: Get the server status (requires verified role).
    - `/reboot`: Reboot the server (requires verified role).
    - `/logs`: Get the server logs (requires verified role).
    - `/console`: Execute a command on the server (requires verified role).

## License

This project is licensed under the MIT License.