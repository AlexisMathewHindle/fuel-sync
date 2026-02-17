# FuelSync

A fueling intelligence layer for endurance athletes that connects training data to personalized recovery and macro guidance.

## Overview

FuelSync bridges the gap between training metrics and nutrition decisions, giving performance-focused athletes clarity and confidence in their fueling without adding manual tracking burden.

Instead of generic calorie tracking, it:
- Interprets workout load from platforms like Strava
- Estimates glycogen depletion
- Provides personalized recovery and macro guidance

## Tech Stack

- **Frontend**: Vue 3 + Vite
- **Routing**: Vue Router
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database + Auth)

## Setup

### Prerequisites

- Node.js 18+ (use `nvm use 23` if you have nvm)
- A Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.template .env
   ```

4. Update `.env` with your Supabase credentials:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `VITE_MAGIC_LINK_REDIRECT_URL` (optional): URL to use for magic link redirect

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable Vue components
│   ├── AppNav.vue   # Navigation component
│   └── LoginForm.vue # Authentication form
├── views/           # Page components
│   ├── CalendarView.vue
│   ├── ImportView.vue
│   ├── SettingsView.vue
│   └── WorkoutDetailView.vue
├── router/          # Vue Router configuration
│   └── index.js
├── lib/             # Utilities and services
│   ├── supabase.js  # Supabase client
│   └── auth.js      # Authentication helpers
├── App.vue          # Root component
└── main.js          # Application entry point
```

## Routes

- `/` - Redirects to calendar
- `/calendar` - Training calendar view
- `/import` - Import training data from platforms
- `/workouts/:id` - Detailed workout view with nutrition recommendations
- `/settings` - User settings and authentication

## Authentication

The app uses Supabase magic link authentication:
1. Navigate to Settings
2. Enter your email
3. Check your email for the magic link
4. Click the link to sign in

For environment-specific redirect behavior:
- Local dev: leave `VITE_MAGIC_LINK_REDIRECT_URL` unset (defaults to `window.location.origin`, usually `http://localhost:5173`)
- Production: set `VITE_MAGIC_LINK_REDIRECT_URL` to your deployed URL (for example, `https://your-site.netlify.app`)
- In Supabase Auth settings, include both local and production URLs in Redirect URLs allowlist

## MVP Roadmap

### Section 1 - Project Scaffolding ✅
- [x] Vue 3 + Vite setup
- [x] Vue Router with required routes
- [x] Tailwind CSS styling
- [x] Supabase client integration
- [x] Magic link authentication

### Section 2 - Data Import (Coming Next)
- [ ] Strava OAuth integration
- [ ] Workout data import
- [ ] Database schema setup

### Section 3 - Workout Analysis
- [ ] Glycogen depletion estimation
- [ ] Recovery recommendations
- [ ] Macro guidance

## License

Private project - All rights reserved
