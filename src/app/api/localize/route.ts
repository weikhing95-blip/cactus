import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

type Market = 'singapore' | 'malaysia' | 'indonesia'
type Domain = 'marketing' | 'legal' | 'casual'
type Tone = 'professional' | 'casual' | 'playful'

const VALID_MARKETS: Market[] = ['singapore', 'malaysia', 'indonesia']
const VALID_DOMAINS: Domain[] = ['marketing', 'legal', 'casual']
const VALID_TONES: Tone[] = ['professional', 'casual', 'playful']

function buildSystemPrompt(market: Market, domain: Domain, tone: Tone, hasImage: boolean): string {
  const marketGuide: Record<Market, string> = {
    singapore: `
## Singapore (Singlish) Localization Guide
You are adapting content for a Singaporean audience. Singapore is a multiracial, multilingual city-state with English, Mandarin, Malay, and Tamil influences.

**Singlish Particles (use contextually, don't overdo it):**
- "lah" — softens statements, adds friendliness: "No worries lah"
- "leh" — indicates mild surprise or gentle assertion: "Like that also can leh"
- "lor" — resignation or matter-of-fact: "Like that lor"
- "mah" — explains something obvious: "Of course like that mah"
- "sia" — expression of strong emotion (surprise, admiration): "So good sia"
- "hor" — seeks agreement or confirmation: "You also think so hor?"
- "can" — used as affirmation or as a verb: "Can! No problem"
- "cannot" — direct refusal: "This one cannot leh"

**Cultural References:**
- MRT (public transport), HDB (public housing), hawker centres (food courts)
- Kiasu (fear of losing out / FOMO) is a core cultural value — Singaporeans love "exclusive", "limited", "first"
- Food is extremely important — food references resonate strongly
- "Good deal" culture — value-for-money messaging works well
- National pride — reference Singapore's efficiency, innovation, safety

**Code-switching:** Occasional Mandarin/Hokkien phrases are natural (e.g., "shiok" = shiok means awesome/satisfying, "bojio" = didn't invite me, "limpeh" = informal "I/me")
`,
    malaysia: `
## Malaysia (Manglish / Bahasa Malaysia) Localization Guide
You are adapting content for a Malaysian audience. Malaysia is a multiracial country with Malay, Chinese, Indian, and indigenous communities.

**Manglish Particles:**
- "lah" — extremely common softener: "No problem lah"
- "leh" — mild assertion or questioning: "Like that also can leh?"
- "lor" — resignation: "Okay lor"
- "mah" — obvious statement: "Of course lah mah"
- "wah" — exclamation of surprise or admiration: "Wah, so cheap!"
- "kan" — seeking agreement (from Malay): "Betul kan?" (True right?)
- "one" — emphasizer at end: "This one very good one"
- "la" (without 'h') also common

**Bahasa Malaysia Code-switching (natural mixing):**
- "Boleh" = can/okay: "Boleh lah"
- "Tak boleh" = cannot
- "Memang" = indeed/really: "Memang best la"
- "Murah" = cheap: "So murah!"
- "Sedap" = delicious: "Confirm sedap one"
- "Best" = great (pronounced 'bes'): "Best gila"
- "Gila" = crazy (in a good/bad way): "Gila cheap"

**Cultural References:**
- Food: nasi lemak, teh tarik, mamak (24-hour Indian Muslim eateries)
- "Value for money" culture like Singapore but more price-sensitive
- Festive seasons: Hari Raya, Chinese New Year, Deepavali are all celebrated
- Malaysian pride: "Malaysia Boleh!" (Malaysia Can!) — national rallying cry
- Humor: Malaysians love self-deprecating and relatable humor
- Family-oriented culture
`,
    indonesia: `
## Indonesia (Bahasa Indonesia / Jakarta Slang) Localization Guide
You are adapting content for an Indonesian audience. Indonesia is the world's largest archipelago with 270+ million people, predominantly Muslim.

**Jakarta / Gaul (street) Slang:**
- "dong" — softener/emphasizer, adds warmth: "Cobain dong" (Try it dong)
- "sih" — softener, mild assertion or questioning: "Emang enak sih" (It really is good)
- "nih" — "here/this", makes things feel immediate: "Cobain nih" (Try this)
- "ya kan" — seeking agreement: "Bagus ya kan?" (Good right?)
- "banget" — very/extremely: "Bagus banget!" (So good!)
- "mantap" — excellent/solid: "Mantap jiwa!" (Awesome!)
- "keren" — cool: "Keren banget"
- "gokil" — crazy cool: "Gokil abis!"
- "wkwkwk" — Indonesian internet laughter (like "lol")
- "yuk" — let's go/come on: "Yuk cobain!"
- "baper" — easily emotional/overthinking: "Jangan baper"
- "kepo" — nosy/curious: "Pada kepo ya"

**Formal Bahasa Indonesia terms to use for Legal domain:**
- Use proper Bahasa Indonesia, not slang
- "Dengan hormat" = respectfully
- "Sebagaimana mestinya" = as appropriate/proper

**Cultural References:**
- Islam is predominant — be respectful of halal, religious values
- Gotong royong (mutual cooperation/community spirit)
- Food: rendang, gado-gado, soto, bakso — food references resonate
- "Anak muda" (youth) culture is very digital-native
- Ojek (motorbike taxi), Gojek/Grab culture — very app-savvy
- "Lebaran" = Eid celebration, important seasonal reference
- Humble, community-first messaging resonates
`,
  }

  const domainGuide: Record<Domain, string> = {
    marketing: `
**Domain: Marketing**
- Focus on emotional appeal, aspirational language
- Use local success stories and relatable scenarios
- CTAs should feel natural and not pushy
- Leverage FOMO and exclusivity where culturally appropriate
- Humor and relatability increase engagement
`,
    legal: `
**Domain: Legal**
- Maintain accuracy and clarity above all
- Use formal register but adapt terminology to feel locally familiar
- Avoid overly Western legal jargon — use locally understood equivalents
- For SG: Use Singapore English conventions
- For MY: Mix formal Bahasa and English appropriately
- For ID: Use proper formal Bahasa Indonesia
- Cultural notes should flag any legal term adaptations
`,
    casual: `
**Domain: Casual / Social**
- Conversational, friendly, relatable tone
- Mimic how locals actually text and speak
- References to local daily life (food, commute, weather)
- Emojis are acceptable where natural
- Humor and playfulness welcome
`,
  }

  const toneGuide: Record<Tone, string> = {
    professional: `
**Tone: Professional**
- Maintain credibility and authority
- Still culturally adapted but uses particles/slang sparingly
- Appropriate for B2B, corporate, or formal consumer contexts
`,
    casual: `
**Tone: Casual**
- Friendly, approachable, relatable
- Use particles and code-switching moderately
- Feels like a knowledgeable friend talking to you
`,
    playful: `
**Tone: Playful**
- Fun, energetic, punchy
- Use slang particles more liberally
- Short sentences, high energy
- Humor and wit welcome
`,
  }

  const imageInstructions = hasImage
    ? `
## Image Processing Instructions
You will receive an image containing text (e.g. an advertisement, banner, product packaging, or screenshot). First extract ALL visible text from the image. Then provide a culturally adapted version for the target market. In your cultural notes, explain both the extraction choices and the cultural adaptations made.

Your JSON response MUST include the "extracted_text" field with all text you found in the image.
`
    : ''

  const outputFormat = hasImage
    ? `{
  "extracted_text": "All text extracted verbatim from the image",
  "adapted_content": "The culturally adapted content here",
  "cultural_notes": [
    "Note 1 explaining a specific adaptation",
    "Note 2 explaining another adaptation",
    ...
  ]
}`
    : `{
  "adapted_content": "The culturally adapted content here",
  "cultural_notes": [
    "Note 1 explaining a specific adaptation",
    "Note 2 explaining another adaptation",
    ...
  ]
}`

  return `You are a world-class SEA (Southeast Asia) cultural localization expert with deep native fluency in Singlish, Manglish, and Bahasa Indonesia. You have spent years living and working across Singapore, Malaysia, and Indonesia.

Your job is to take English content and adapt it to feel **genuinely local** — not just translated, but culturally resonant. You understand that great localization is about capturing the spirit and cultural context, not just swapping words.
${imageInstructions}
${marketGuide[market]}
${domainGuide[domain]}
${toneGuide[tone]}

## Critical Rules:
1. **Never over-localize** — use particles and slang naturally, not in every sentence
2. **Preserve the core message** — don't change facts, just the cultural framing
3. **Cultural resonance over literal translation** — ask "how would a local say this?"
4. **Provide specific, insightful cultural notes** — explain EACH adaptation you made and WHY it works culturally

## Output Format:
You MUST respond with ONLY a valid JSON object (no markdown, no preamble) in this exact format:
${outputFormat}

Each cultural note should be specific — reference the actual change made and the cultural reason behind it. Aim for 3–7 notes.`
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

const ACCEPTED_MEDIA_TYPES: ImageMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    const isMultipart = contentType.includes('multipart/form-data')

    let content = ''
    let market: Market = 'singapore'
    let domain: Domain = 'marketing'
    let tone: Tone = 'casual'
    let imageBase64: string | null = null
    let imageMediaType: ImageMediaType | null = null

    if (isMultipart) {
      const formData = await req.formData()

      content = (formData.get('content') as string) || ''
      market = (formData.get('market') as Market) || 'singapore'
      domain = (formData.get('domain') as Domain) || 'marketing'
      tone = (formData.get('tone') as Tone) || 'casual'

      const imageFile = formData.get('image') as File | null
      if (imageFile && imageFile.size > 0) {
        if (!ACCEPTED_MEDIA_TYPES.includes(imageFile.type as ImageMediaType)) {
          return NextResponse.json(
            { error: `Unsupported image type: ${imageFile.type}. Use JPG, PNG, GIF, or WEBP.` },
            { status: 400 }
          )
        }
        if (imageFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'Image too large. Maximum size is 5MB.' },
            { status: 400 }
          )
        }
        const arrayBuffer = await imageFile.arrayBuffer()
        imageBase64 = Buffer.from(arrayBuffer).toString('base64')
        imageMediaType = imageFile.type as ImageMediaType
      }
    } else {
      const body = await req.json()
      content = body.content || ''
      market = body.market || 'singapore'
      domain = body.domain || 'marketing'
      tone = body.tone || 'casual'
    }

    // Validate params
    if (!VALID_MARKETS.includes(market)) {
      return NextResponse.json({ error: 'Invalid market' }, { status: 400 })
    }
    if (!VALID_DOMAINS.includes(domain)) {
      return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
    }
    if (!VALID_TONES.includes(tone)) {
      return NextResponse.json({ error: 'Invalid tone' }, { status: 400 })
    }

    const hasImage = imageBase64 !== null

    if (!hasImage && !content.trim()) {
      return NextResponse.json({ error: 'Please provide content or upload an image.' }, { status: 400 })
    }

    if (content.trim()) {
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length
      if (wordCount > 500) {
        return NextResponse.json({ error: 'Content exceeds 500 words' }, { status: 400 })
      }
    }

    const systemPrompt = buildSystemPrompt(market, domain, tone, hasImage)

    // Build message content
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: ImageMediaType; data: string } }

    const userContentBlocks: ContentBlock[] = []

    if (hasImage && imageBase64 && imageMediaType) {
      userContentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageMediaType,
          data: imageBase64,
        },
      })
    }

    if (content.trim()) {
      userContentBlocks.push({
        type: 'text',
        text: hasImage
          ? `The image above contains the content to localize. ${content.trim() ? `Additional context from the user: ${content.trim()}` : ''}`
          : `Please localize the following content:\n\n${content}`,
      })
    } else if (hasImage) {
      userContentBlocks.push({
        type: 'text',
        text: 'Please extract all text from this image and provide a culturally localized version for the target market.',
      })
    }

    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContentBlocks,
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON from response
    let parsed: { adapted_content: string; cultural_notes: string[]; extracted_text?: string }
    try {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    if (!parsed.adapted_content || !Array.isArray(parsed.cultural_notes)) {
      return NextResponse.json(
        { error: 'Unexpected AI response format. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Localize API error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
