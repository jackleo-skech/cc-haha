export async function handleTranslateApi(
  req: Request,
  _url: URL,
  _segments: string[],
): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  let body: { text?: string; targetLang?: string }
  try {
    body = (await req.json()) as { text?: string; targetLang?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const text = body.text?.trim()
  const targetLang = body.targetLang?.trim() || 'Chinese'

  if (!text) {
    return Response.json({ error: 'text is required' }, { status: 400 })
  }

  try {
    const translatedText = await translate(text, targetLang)
    return Response.json({ translatedText })
  } catch (err) {
    console.error('[Translate] Error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Translation failed' },
      { status: 502 },
    )
  }
}

async function translate(text: string, targetLang: string): Promise<string> {
  const LITELLM_URL = process.env.LITELLM_BASE || process.env.LITELLM_URL || 'http://0.0.0.0:4000'
  const LITELLM_API_KEY = process.env.LITELLM_API_KEY || 'sk-lite-llm-prod-key-2024'
  const { ProviderService } = await import('../services/providerService.js')
  const provider = await new ProviderService().getActiveProvider()
  const model = process.env.TRANSLATE_MODEL || provider?.models?.translate || provider?.models?.main || process.env.ANTHROPIC_MODEL || 'gpt-3.5-turbo'

  const isChineseText = /[\u4e00-\u9fff]/.test(text)
  const effectiveTargetLang = isChineseText ? 'English' : 'Chinese'

  const response = await fetch(`${LITELLM_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LITELLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a translation engine. Return ONLY the translation, no explanations, no notes, no greetings.',
        },
        {
          role: 'user',
          content: `Translate to ${effectiveTargetLang}:\n${text}`,
        },
      ],
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Translation API returned HTTP ${response.status}: ${errText.slice(0, 300)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const translated = data.choices?.[0]?.message?.content?.trim()
  if (!translated) {
    throw new Error('Empty translation response')
  }

  return translated
}
