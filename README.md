This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Standalone Backend for Koyeb

The deployable backend lives in `backend/`.

```bash
cd backend
npm install
npm run build
npm start
```

For Koyeb, deploy with:

- Dockerfile path: `backend/Dockerfile`
- Build context: `backend`
- Port: `8080`
- Database schema: applied automatically from `backend/db/schema.sql` on backend startup when `DATABASE_URL` is set.

See `backend/README.md` and `backend/.env.example` for environment variables.

For the frontend, set the deployed backend origin in `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=https://your-linq-backend.koyeb.app
```

Use the origin only, not `/api`; the frontend client adds `/api/...` paths itself. If this is empty, the app falls back to same-origin Next.js API routes for local development.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
