# Google sign-in setup

1. Go to https://console.cloud.google.com and create a project (any name).
2. **APIs & Services > OAuth consent screen**: choose **External**, enter the app name (Huddle) and your email, save. While the app is in **Testing**, add your own Gmail (and any friends) under **Test users**, or click **Publish app** so anyone can sign in.
3. **APIs & Services > Credentials > Create credentials > OAuth client ID**, type **Web application**.
4. Under **Authorized JavaScript origins** add `http://localhost:5173` and `http://localhost`. Later also add your deployed frontend URL (for example `https://huddle.vercel.app`). No redirect URI is needed.
5. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`) and put it in two places:
   * `backend/.env`:   `GOOGLE_CLIENT_ID=your-client-id`
   * `frontend/.env`:  `VITE_GOOGLE_CLIENT_ID=your-client-id`
6. Run `npm install` in both folders, restart both servers, open the sign-in page.

The Client ID is public (it is visible in the browser). Never put a "client secret" anywhere: this flow does not use one.

## How it works (for interviews)
1. The browser shows Google's button. After the user picks an account, Google returns a signed **ID token** (a JWT) to the page.
2. The page sends that token to `POST /api/v1/auth/google`.
3. The server verifies it with `google-auth-library`: signature, expiry, and that the **audience** equals our client id (so a token made for another app is rejected). It also requires `email_verified`.
4. The server finds the user by Google id (or by verified email, linking an existing password account), creates one if needed, and returns **our own** JWT. The rest of the app does not care how you signed in.
