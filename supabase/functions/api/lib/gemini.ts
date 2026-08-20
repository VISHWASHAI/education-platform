// deno-lint-ignore-file no-explicit-any
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash';

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

async function callGemini(body: unknown) {
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

  contents.push({ role: 'model', parts: [{ functionCall: call }] });
  contents.push({
    role: 'function',
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
