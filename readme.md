# P.U.L.S.E.D-API-backend

## Setup

1. **Clone the repository**:
    ```sh
    git clone https://github.com/yourusername/P.U.L.S.E.D-API-backend.git
    cd P.U.L.S.E.D-API-backend
    ```

2. **Install dependencies**:
    ```sh
    npm install
    ```

3. **Create a [.env](http://_vscodecontentref_/2) file**:
    ```properties
    SESSION_SECRET="your_session_secret"
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"
    CALLBACK_URL="your_callback_url"
    DISCORD_TOKEN="your_discord_token"
    API_URL="your_api_url"
    API_TOKEN="your_api_token"
    DISCORD_CHANNEL_ID="your_discord_channel_id"
    DISCORD_WEBHOOK_URL="your_discord_webhook_url"
    PASTEBIN_API_KEY="your_pastebin_api_key"
    PASTEBIN_USER_NAME="your_pastebin_username"
    PASTEBIN_USER_PASSWORD="your_pastebin_password"
    CLIENT_ID="your_discord_client_id"
    GUILD_ID="your_discord_guild_id"
    VERIFIED_ROLE_ID="your_verified_role_id"
    ```

4. **Run the application**:
    ```sh
    npm start
    ```

## Usage

### Bot Commands

- `/status`: Get the server status.
- `/reboot`: Reboot the server.
- `/logs`: Get the server logs.
- `/console`: Execute a command on the server.
- `/verify`: Verify your account with a bearer token.

### API Endpoints

- `GET /health`: Get the server health.
- `GET /systeminfo`: Get the system information.
- `GET /websiteStatus`: Check the website status.
- `POST /reboot`: Reboot the server.
- `GET /logs`: Get the server logs.
- `POST /verify`: Verify a bearer token.

## Contributing

Feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.