// OpenAI Client Module for LeadPulse AI
// Handles API calls with retry logic and JSON response parsing

export interface AIConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4000,
};

export interface AIResponse<T = any> {
  data: T | null;
  raw: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  error: string | null;
}

/**
 * Call OpenAI Chat Completions API
 */
export async function callOpenAI<T = any>(
  prompt: string,
  systemPrompt: string,
  config: AIConfig
): Promise<AIResponse<T>> {
  const { apiKey, model, temperature, maxTokens } = { ...DEFAULT_CONFIG, ...config };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      data: null,
      raw: errorBody,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      error: `OpenAI API error ${response.status}: ${errorBody}`,
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const usage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0,
  };

  if (!content) {
    return { data: null, raw: '', usage, error: 'AI returned no content' };
  }

  // Parse JSON from the response
  const parsed = parseJSONResponse<T>(content);
  return { data: parsed, raw: content, usage, error: parsed ? null : 'Failed to parse AI JSON response' };
}

/**
 * Call OpenAI with retry logic (up to 3 attempts)
 */
export async function callOpenAIWithRetry<T = any>(
  prompt: string,
  systemPrompt: string,
  config: AIConfig,
  maxRetries = 3
): Promise<AIResponse<T>> {
  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await callOpenAI<T>(prompt, systemPrompt, config);

    if (result.data) return result;

    lastError = result.error || 'Unknown error';

    // Don't retry auth errors
    if (lastError.includes('401') || lastError.includes('403')) break;

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  return {
    data: null,
    raw: '',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    error: `Failed after ${maxRetries} attempts: ${lastError}`,
  };
}

/**
 * Parse JSON from AI response, handling markdown fencing and common issues
 */
function parseJSONResponse<T>(content: string): T | null {
  // Try direct parse first
  try {
    return JSON.parse(content);
  } catch {
    // Continue to other methods
  }

  // Try to extract JSON from markdown fencing
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Try to find JSON object/array in the text
  const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch {
      // Continue
    }
  }

  const jsonArrayMatch = content.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      return JSON.parse(jsonArrayMatch[0]);
    } catch {
      // Give up
    }
  }

  return null;
}
