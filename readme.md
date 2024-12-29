# Back-end API for Handling Requests to Receive and Send Data Securely

## Tutorial to Start API Server

### Prerequisites
1. Install [Node.js](https://nodejs.org/en) LTS version.
2. Install [npm](https://www.npmjs.com/get-npm) (comes with Node.js).

### Steps to Start the API Server

#### 1. Clone the Repository
First, clone the repository to your local machine:
```sh
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
```

#### 2. Install Required Packages
Navigate to the project directory and install the required packages:
```sh
npm install
```

#### 3. Set Up Environment Variables
Create a 

.env

 file in the root of your project and add the following environment variables:
```
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://your-ngrok-url/auth/google/callback
```
Replace `your_session_secret`, `your_google_client_id`, `your_google_client_secret`, and `your-ngrok-url` with your actual values.

#### 4. Start ngrok
If you are using ngrok to expose your local server, start ngrok:
```sh
ngrok http 3000
```
Copy the URL provided by ngrok and update the `CALLBACK_URL` in your 

.env

 file.

#### 5. Start the Server
Start the API server:
```sh
npm start
```
The server will start and listen on port 3000.

### Endpoints

#### 1. Google OAuth Authentication
Initiate the OAuth flow by navigating to:
```
http://your-ngrok-url/auth/google
```

#### 2. Receive Data
Send a POST request to `/receive` with the data you want to encrypt:
```
POST http://your-ngrok-url/receive
Headers:
  Authorization: Bearer your_access_token
Body:
  {
    "data": "This is some data"
  }
```

#### 3. Send Data
Send a GET request to `/send` to receive encrypted data:
```
GET http://your-ngrok-url/send
Headers:
  Authorization: Bearer your_access_token
```

#### 4. Health Check
Send a GET request to `/health` to check the API health and statistics:
```
GET http://your-ngrok-url/health
Headers:
  Authorization: Bearer your_access_token
```

### Example using Postman

1. **Open Postman**.
2. **Set the request type to GET or POST**.
3. **Enter the URL**:
   ```
   http://your-ngrok-url/receive
   ```
4. **Go to the Authorization tab**.
5. **Select Bearer Token** as the type.
6. **Enter the access token**.
7. **Set the request body (for POST requests)**:
   ```json
   {
     "data": "This is some data"
   }
   ```
8. **Send the request**.

### Example using cURL

```sh
curl -H "Authorization: Bearer your_access_token" -X POST -d '{"data":"This is some data"}' http://your-ngrok-url/receive
```

### Notes
- Ensure your 

.env

 file is added to 

.gitignore

 to prevent it from being committed to your repository.
- Replace `your_access_token` with the actual access token obtained from the OAuth flow.

By following these steps, you can set up and start the API server, and use the provided endpoints to receive and send data securely.
```