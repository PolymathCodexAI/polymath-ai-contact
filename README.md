# PolyMath AI Contact

A stateful, phone-inspired AI assistant designed to capture leads for Polymath Code with a premium experience.

## Deployment Instructions

### 1. Backend (Render)
- Go to your [Render Dashboard](https://dashboard.render.com).
- Click **"New"** -> **"Blueprint"**.
- Connect your `polymath-ai-contact` GitHub repository.
- Render will automatically detect the `render.yaml` file.
- It will ask you to provide your `RESEND_API_KEY`.
- Once deployed, copy the **Service URL** (e.g., `https://polymath-ai-contact-backend.onrender.com`).

### 2. Frontend (Vercel)
- Go to [Vercel.com](https://vercel.com).
- Import the `polymath-ai-contact` repository.
- Set the **Root Directory** to `client`.
- Add an **Environment Variable**:
  - `VITE_API_URL`: (The URL of your Render backend).
- Click **Deploy**.

## Local Development

### Prerequisites
- Node.js installed.
- A Resend API Key.

### Setup
1. Clone the repository.
2. In `server/`, create a `.env` file with `RESEND_API_KEY`.
3. Run `npm install` in both `client/` and `server/` folders.
4. Run `node server/server.js` for the backend.
5. Run `npm run dev` in the `client/` folder.
