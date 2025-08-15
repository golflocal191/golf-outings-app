# Golf Outings Web Application

This project is a lightweight web application for managing golf outings.  It allows participants to view upcoming events, sign up with their details (name, email, phone number, handicap and optional notes) and receive confirmation emails.  Administrators can create new events, view sign‑ups and send reminder emails to all participants for an event.

## Features

- Responsive, mobile‑friendly design using [Bootstrap 5](https://getbootstrap.com/)
- Front page lists upcoming golf events with date, time, location and a description
- Participants can sign up for an event, storing their details in a simple JSON database
- Confirmation emails are sent to participants when they sign up (requires configuring SMTP credentials)
- Administrator interface with password protection allows:
  - Viewing and exporting sign‑up lists for each event
  - Creating and editing events
  - Sending reminder emails to all participants of an event

## Getting started

1. **Clone or download the repository.**

2. **Install dependencies** (requires Node.js ≥14).  Run this command from the project directory:

   ```bash
   npm install
   ```

   > If you run into network or permission errors installing packages, ensure your environment can access the npm registry.  Alternatively, you can install the dependencies on your own machine and copy the resulting `node_modules` folder into the project directory.

3. **Configure environment variables.**  Create a file named `.env` in the project root with the following contents:

   ```ini
   PORT=3000
   # Credentials for sending emails via SMTP (Gmail works well on the free tier but you can use any provider).
   EMAIL_USER=golflocal191@gmail.com
   EMAIL_PASS=your_email_password
   # Administrator credentials for logging into the admin dashboard.
   ADMIN_USER=admin
   ADMIN_PASS=admin
   # Secret string used to sign sessions; choose any random string.
   SESSION_SECRET=some_random_secret
   ```

   Replace `golflocal191@gmail.com` with the actual email address you'll use to send messages and `your_email_password` with its password.  If you plan to use Gmail, you may need to [enable “App Passwords”](https://support.google.com/accounts/answer/185833) or [less secure app access](https://support.google.com/accounts/answer/6010255) depending on your account.

4. **Seed the database** (optional).  The application uses a JSON file (`db.json`) to store events and sign‑ups.  One sample event is included by default.  You can modify or add more events manually in this file or via the admin interface once the app is running.

5. **Start the server.**

   ```bash
   npm start
   ```

   The application will be available at `http://localhost:3000` (or whatever port you configured).

6. **Access the admin interface.**  Navigate to `http://localhost:3000/admin/login` and log in using the credentials you specified in your `.env` file.  From there you can create events, view sign‑ups and send notifications.

## Deploying for free

Several cloud platforms offer free tiers suitable for small personal projects:

- [Render](https://render.com/):  You can deploy a Node.js web service with a free plan.  Create a new Web Service, connect your Git repository and configure the build command (`npm install`) and start command (`npm start`).  Set your environment variables in the **Environment** section.
- [Railway](https://railway.app/) and [Fly.io](https://fly.io/) provide similar free tiers for small apps.
- [Glitch](https://glitch.com/) allows you to quickly spin up Node projects with limited resources.

When deploying, make sure to set environment variables (especially `EMAIL_USER` and `EMAIL_PASS`) through your hosting provider’s dashboard.  You should also use a long, random `SESSION_SECRET` and strong admin credentials.

## Creating the email account

This project assumes that you have an email address from which notifications can be sent.  In our sample configuration we refer to **golflocal191@gmail.com**.  Unfortunately, automated creation of new Gmail accounts is restricted due to Google’s policies, so you’ll need to create the account manually:

1. Visit [https://accounts.google.com/signup](https://accounts.google.com/signup) in your web browser.
2. Follow the prompts to create a new account.  Google may ask for a phone number for verification.
3. Choose a strong password for the account.  A sample password you could use is `GolfLocal2025!`; feel free to modify it to meet your own security requirements.
4. Once created, return to your project’s `.env` file and update the `EMAIL_USER` and `EMAIL_PASS` variables accordingly.

If you prefer not to use Gmail, you can sign up for other providers (e.g. Proton Mail, Outlook, Mail.com) and adjust the `createTransporter()` function in `app.js` to match your provider’s SMTP settings.  By default the app is configured to work with Gmail.

## Adding new fields

The sign‑up form currently collects Name, Email, Phone Number, Handicap and Notes.  To add more fields, edit `views/signup.ejs` to include new `<input>` elements and update the route in `app.js` that handles form submission to store and display the additional data.

## License

This project is provided under the MIT license.  Feel free to modify and adapt it to your needs.