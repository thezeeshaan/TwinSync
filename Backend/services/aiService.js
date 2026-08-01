const OpenAI = require('openai');

// ─────────────────────────────────────────────────────────────
// PROVIDER CONFIG
// All values come from .env — swap provider just by changing .env.
// No code changes needed when switching between Groq, OpenRouter,
// OpenAI, Together AI, Mistral, etc.
//
//  AI_API_KEY  = your API key (from Groq, OpenAI, OpenRouter, etc.)
//  AI_BASE_URL = provider's OpenAI-compatible endpoint
//  AI_MODEL    = model name to use
//
// Quick setup for common providers:
//
//  Groq (recommended — 14,400 free req/day, no credit card):
//    AI_BASE_URL=https://api.groq.com/openai/v1
//    AI_MODEL=llama-3.3-70b-versatile
//
//  OpenRouter (access to many free models):
//    AI_BASE_URL=https://openrouter.ai/api/v1
//    AI_MODEL=meta-llama/llama-3.3-70b-instruct:free
//
//  OpenAI (paid):
//    AI_BASE_URL=https://api.openai.com/v1
//    AI_MODEL=gpt-4o-mini
//
//  Gemini (via OpenAI-compatible endpoint):
//    AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
//    AI_MODEL=gemini-2.0-flash
// ─────────────────────────────────────────────────────────────

const AI_API_KEY  = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
const AI_MODEL    = process.env.AI_MODEL    || 'llama-3.3-70b-versatile';

if (!AI_API_KEY) {
  throw new Error('[AI Service] No API key found. Set AI_API_KEY in .env');
}

const client = new OpenAI({ apiKey: AI_API_KEY, baseURL: AI_BASE_URL });

console.log(`[AI Service] Provider: ${AI_BASE_URL} | Model: ${AI_MODEL}`);

// ─────────────────────────────────────────────────────────────
// DEV MOCK FALLBACK
// If the API call fails (quota, bad key, etc.) return a safe
// mock response so the frontend doesn't crash during development.
// ─────────────────────────────────────────────────────────────
const MOCK_TEXT = `Hello! TwinSync AI is running in **Offline Dev Mode** because the AI API key is out of quota or invalid. Replace AI_API_KEY in your .env file with a valid key from Groq (console.groq.com) to get 14,400 free requests/day!`;

const MOCK_JSON = {
  reply: MOCK_TEXT,
  should_end: false,
  isComplete: false,
  distress_score: 0,
  pss_scores: { Q1:1,Q2:1,Q3:1,Q4:1,Q5:1,Q6:1,Q7:1,Q8:1,Q9:1,Q10:1 },
  pss_total: 10,
};

// ─────────────────────────────────────────────────────────────
// HELPER: Convert Gemini-style history to OpenAI messages format
// Gemini: [{ role: 'user'|'model', parts: [{ text }] }]
// OpenAI: [{ role: 'user'|'assistant', content: string }]
// ─────────────────────────────────────────────────────────────
function toOpenAIMessages(systemPrompt, history, userMessage) {
  const messages = [{ role: 'system', content: systemPrompt }];

  for (const turn of history) {
    // Support both Gemini format (parts[].text) and plain {role, content}
    const content = turn.parts ? turn.parts[0]?.text : turn.content;
    const role    = (turn.role === 'model') ? 'assistant' : turn.role;
    if (content) messages.push({ role, content });
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// Same function signatures as the old geminiService.js —
// all controllers work without any changes.
// ─────────────────────────────────────────────────────────────

/**
 * Send a prompt and get a plain-text reply.
 * @param {string} systemPrompt - System instructions for the AI
 * @param {Array}  history      - Conversation history (Gemini or OpenAI format)
 * @param {string} userMessage  - The latest user message
 * @returns {Promise<string>}   - AI's text reply
 */
async function chat(systemPrompt, history, userMessage) {
  try {
    const messages  = toOpenAIMessages(systemPrompt, history, userMessage);
    const response  = await client.chat.completions.create({ model: AI_MODEL, messages });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('[AI Service] chat() failed:', err.message);
    console.warn('⚠️  Returning DEV MOCK text to prevent frontend crash.');
    return MOCK_TEXT;
  }
}

/**
 * Send a prompt and get a structured JSON reply.
 * The AI is instructed to return valid JSON. We parse and return it.
 * @param {string} systemPrompt
 * @param {Array}  history
 * @param {string} userMessage
 * @returns {Promise<Object>}
 */
async function chatJSON(systemPrompt, history, userMessage) {
  try {
    const jsonSystemPrompt = `${systemPrompt}\n\nIMPORTANT: You MUST reply with valid JSON only. No markdown, no code fences, no explanation. Just the raw JSON object.`;
    const messages = toOpenAIMessages(jsonSystemPrompt, history, userMessage);

    const response = await client.chat.completions.create({
      model: AI_MODEL,
      messages,
      response_format: { type: 'json_object' }, // Supported by Groq, OpenAI, Together AI
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    // Fallback: try without response_format if provider doesn't support it
    try {
      console.warn('[AI Service] json_object mode failed, retrying without it...');
      const messages = toOpenAIMessages(
        `${systemPrompt}\n\nIMPORTANT: Reply with valid JSON only. No markdown fences.`,
        history, userMessage
      );
      const response = await client.chat.completions.create({ model: AI_MODEL, messages });
      const text = response.choices[0].message.content.trim();
      // Strip markdown fences if model adds them despite instructions
      const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err2) {
      console.error('[AI Service] chatJSON() failed:', err2.message);
      console.warn('⚠️  Returning DEV MOCK JSON to prevent frontend crash.');
      return MOCK_JSON;
    }
  }
}

module.exports = { chat, chatJSON };
