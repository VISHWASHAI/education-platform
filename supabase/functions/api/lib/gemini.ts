// deno-lint-ignore-file no-explicit-any
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash';

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export class CopilotBusyError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(body: unknown, attempt = 0): Promise<any> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (res.status === 429) {
    if (attempt < 1) {
      await sleep(4000);
      return callGemini(body, attempt + 1);
    }
    throw new CopilotBusyError("The assistant is getting a lot of questions right now — try again in about a minute.");
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }
  return res.json();
}

function extractParts(response: any) {
  return response?.candidates?.[0]?.content?.parts ?? [];
}

/**
 * Runs the "pick a tool, execute it, explain the result" loop.
 * `executeTool` is provided by the caller so tool execution stays scoped to the
 * authenticated user (RBAC) rather than living inside this generic client.
 */
export async function runCopilotTurn(
  question: string,
  systemInstruction: string,
  tools: FunctionDeclaration[],
  executeTool: (call: FunctionCall) => Promise<unknown>
): Promise<{ answer: string; toolUsed: string | null }> {
  const contents: any[] = [{ role: 'user', parts: [{ text: question }] }];

  const first = await callGemini({
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    tools: [{ functionDeclarations: tools }],
  });

  const parts = extractParts(first);
  const functionCallPart = parts.find((p: any) => p.functionCall);

  if (!functionCallPart) {
    const text = parts.map((p: any) => p.text ?? '').join('').trim();
    return { answer: text || "I wasn't able to answer that.", toolUsed: null };
  }

  const call = functionCallPart.functionCall as FunctionCall;
  let toolResult: unknown;
  try {
    toolResult = await executeTool(call);
  } catch (err) {
    toolResult = { error: err instanceof Error ? err.message : 'Tool execution failed' };
  }

  // Echo back the model's turn exactly as received (including any
  // thoughtSignature on the functionCall part) — this model rejects a
  // reconstructed part that's missing that field.
  contents.push(first.candidates[0].content);
  contents.push({
    role: 'user',
    parts: [{ functionResponse: { name: call.name, response: { result: toolResult } } }],
  });

  const second = await callGemini({
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    tools: [{ functionDeclarations: tools }],
  });

  const finalParts = extractParts(second);
  const text = finalParts.map((p: any) => p.text ?? '').join('').trim();
  return { answer: text || 'I found the data but had trouble summarizing it.', toolUsed: call.name };
}
