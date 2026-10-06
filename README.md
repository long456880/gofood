# GoFood

A recipe app for home cooks and chefs, in **English and Khmer**. Cooks browse recipes by cuisine and category, follow step-by-step cooking guides with animations and timers, and unlock premium recipes by paying through Bakong KHQR. Chefs upload their own recipes and earn from sales. An admin reviews recipes and helps users.

## Features

- **Browse and search** recipes by cuisine and category, with favorites and ratings
- **Cooking mode**: one step at a time, with ingredient highlights, cooking animations, plain-word explanations of hard cooking terms, and timers
- **Free and paid recipes**: payment through Bakong KHQR; chefs receive 90% of each sale
- **Chef tools**: upload recipes, see your recipes and sales
- **Admin tools**: review and approve recipes, handle reports, restore deleted recipes, sales dashboard, support inbox
- **Support chat**: users message the admin inside the app, with photos
- **Notifications** in the app for purchases, approvals, reports and support replies
- Sign in with email or Google, English/Khmer switch, light and dark mode

## Tech

Expo (React Native, Expo Router with API routes), Supabase (auth, Postgres, storage), Bakong KHQR for payments.

## Run it

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root. Copy `.env.example` and fill in your own values (the real `.env` is private and is not in this repo).

3. Start the server

   ```bash
   npx expo start
   ```

4. Open the app on a phone with [Expo Go](https://expo.dev/go) by scanning the QR code. The phone and the computer must be on the **same Wi-Fi**. If the venue Wi-Fi blocks devices, use a phone hotspot for both.

   To let phones on other networks connect, use `npx expo start --tunnel` instead.

The app loads its data through this server, so keep the terminal open while the app is in use.

## Database

The Supabase database changes are in `supabase/migrations/`. The support chat uses the `support_messages` table.
