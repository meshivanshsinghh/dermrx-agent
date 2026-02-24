<h1 align="center">DermRx Agent — Frontend</h1>

<p align="center">
  <em>Next.js clinical interface for the DermRx Agent pipeline</em>
</p>

<p align="center">
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white">
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
    <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
</p>

---

## Overview

The frontend is a **Next.js 16** app with the App Router that provides two experiences:

1. **Landing Page** — product overview with architecture breakdown, comparison table, and demo scenarios
2. **Clinical App** — the main workspace for analyzing skin images, checking drug safety, and chatting with MedGemma

### Key Features

- **Image Upload & Analysis** — upload a skin image, enter patient medications, and run the full pipeline
- **Drug Safety Check** — standalone drug evaluation with DDI, toxicity, and food/disease interaction results
- **Clinical Chat** — context-aware follow-up Q&A powered by MedGemma, scoped to the current analysis
- **PDF Export** — download a structured clinical report for any analysis session
- **Demo Mode** — automatic fallback to pre-captured data when the backend is unavailable
- **Startup Health Check** — 8-second backend connectivity check with graceful demo mode fallback

---

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
---

## Deployment

The frontend is deployed on **Vercel** at [dermrx-agent.vercel.app](https://dermrx-agent.vercel.app).

```bash
npm run build   # Verify production build
```

The `next.config.ts` is configured to proxy API requests and handle image domains for the deployment.
