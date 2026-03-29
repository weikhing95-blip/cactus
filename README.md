# Cactus 🌵

**Where global brands become local.**

Cactus is a SEA (Southeast Asia) cultural localization platform. Paste English content, pick your target market and tone, and get culturally adapted output that feels genuinely local — not just translated.

## Supported Markets

| Market | Style |
|--------|-------|
| 🇸🇬 Singapore | Singlish particles (lah, leh, lor, sia, hor) |
| 🇲🇾 Malaysia | Manglish + Bahasa Malaysia code-switching |
| 🇮🇩 Indonesia | Bahasa Indonesia + Jakarta slang (dong, sih, nih, ya kan) |

## Features

- 🌏 **3 SEA markets** — Singapore, Malaysia, Indonesia
- 📝 **3 domains** — Marketing, Legal, Casual/Social
- 🎭 **3 tones** — Professional, Casual, Playful
- 💡 **Cultural notes** — explains each adaptation made and why
- ⚡ **Powered by Claude** (claude-3-5-sonnet-20241022)

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Anthropic Claude API**
- **TypeScript**

## Running Locally

### Prerequisites

- Node.js 18+
- An Anthropic API key

### Setup

```bash
# 1. Clone/enter the project
cd cactus

# 2. Install dependencies (include dev deps explicitly if NODE_ENV=production)
npm install --include=dev

# 3. Set your API key
echo "ANTHROPIC_API_KEY=your_key_here" > .env.local

# 4. Start the dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add environment variable: `ANTHROPIC_API_KEY` = your key
4. Deploy — Vercel auto-detects Next.js, no config needed

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
# Follow prompts, add ANTHROPIC_API_KEY when asked
```

## Project Structure

```
cactus/
├── src/
│   └── app/
│       ├── layout.tsx          # Root layout
│       ├── page.tsx            # Home page with localization form
│       ├── globals.css         # Tailwind imports
│       └── api/
│           └── localize/
│               └── route.ts   # POST /api/localize — calls Claude
├── .env.local                  # API key (not committed)
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## API

### `POST /api/localize`

**Request body:**
```json
{
  "content": "Your English content here",
  "market": "singapore | malaysia | indonesia",
  "domain": "marketing | legal | casual",
  "tone": "professional | casual | playful"
}
```

**Response:**
```json
{
  "adapted_content": "Culturally adapted version of your content",
  "cultural_notes": [
    "Used 'lah' at the end of the opening line to create warmth and familiarity...",
    "..."
  ]
}
```

## License

MIT
