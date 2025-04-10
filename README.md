# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/991747f4-8458-43cb-b637-f16b7864051b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/991747f4-8458-43cb-b637-f16b7864051b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/991747f4-8458-43cb-b637-f16b7864051b) and click on Share -> Publish.

## Setting up GitHub OAuth with Supabase

To use your actual GitHub data with Supabase authentication:

1. Create a Supabase project:

   - Go to [Supabase](https://supabase.com/) and create a new project
   - Note your project URL and anon key from the API settings

2. Configure GitHub OAuth provider in Supabase:

   - In your Supabase project, go to Authentication → Providers → GitHub
   - Toggle GitHub to enable it
   - Create a GitHub OAuth application as described below
   - Set the GitHub Client ID and Client Secret in Supabase

3. Create a GitHub OAuth application:

   - Go to your GitHub Settings → Developer settings → OAuth Apps → New OAuth App
   - Set Application name (e.g., "Bro Your Commits Slacking")
   - Set Homepage URL to your app's URL
   - Set Authorization callback URL to: `https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/auth/v1/callback`
   - Register the application

4. Configure environment variables:

   - Copy `.env.example` to `.env`
   - Set `VITE_SUPABASE_URL` to your Supabase project URL
   - Set `VITE_SUPABASE_ANON_KEY` to your Supabase anon key

5. Restart your application and log in with GitHub to see your real data

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
