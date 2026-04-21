import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const SYSTEM_PROMPT = `You are an AI School Counselor assistant for MyCounselor, a school counseling platform. You are warm, empathetic, professional, and knowledgeable about:

- Academic planning and course selection
- College preparation, applications, and essay guidance
- Career exploration and planning
- Social-emotional support and coping strategies
- Study skills, time management, and organization
- Managing stress, anxiety, and academic pressure
- Scholarship and financial aid guidance
- Extracurricular activities and leadership opportunities
- Major and career path exploration

Guidelines:
- Be supportive, encouraging, and non-judgmental at all times
- Give practical, actionable advice appropriate for high school students
- Keep responses clear and focused — not overly long
- Use a friendly but professional tone
- If a student mentions a serious concern (mental health crisis, self-harm, abuse, safety), always prioritize their wellbeing. Encourage them to speak with their human school counselor or a trusted adult immediately, and provide crisis resources (988 Suicide & Crisis Lifeline: call or text 988)
- You complement but do not replace the student's human school counselor — regularly remind them their counselor is available for deeper, personalized support
- When you don't know something specific to their school or situation, say so and suggest they ask their counselor`;

interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

interface UserContext {
  firstName?: string;
  gradeLevel?: string;
}

const VALID_ROLES = new Set(['user', 'assistant']);
const MAX_CONTENT_LENGTH = 5000;
const MAX_MESSAGES = 100;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
    return NextResponse.json(
      { error: 'AI Counselor is not configured yet. Please add your ANTHROPIC_API_KEY to the .env file.' },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  // Verify Supabase session token
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  }
  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error: authError } = await supabase.auth.getUser(token);
  if (authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  }

  let messages: MessageParam[];
  let userContext: UserContext | undefined;

  try {
    const body = await request.json();
    messages = body.messages;
    userContext = body.userContext;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers: CORS_HEADERS });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages array is required.' }, { status: 400, headers: CORS_HEADERS });
  }

  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'Too many messages.' }, { status: 400, headers: CORS_HEADERS });
  }

  for (const msg of messages) {
    if (
      !VALID_ROLES.has(msg.role) ||
      typeof msg.content !== 'string' ||
      msg.content.length === 0 ||
      msg.content.length > MAX_CONTENT_LENGTH
    ) {
      return NextResponse.json({ error: 'Invalid message format.' }, { status: 400, headers: CORS_HEADERS });
    }
  }

  // Sanitize user context before injecting into system prompt
  const safeName = userContext?.firstName
    ? String(userContext.firstName).trim().slice(0, 50)
    : undefined;
  const safeGrade = userContext?.gradeLevel
    ? String(userContext.gradeLevel).trim().slice(0, 30)
    : undefined;

  const systemPrompt = safeName
    ? `${SYSTEM_PROMPT}\n\nYou are currently speaking with ${safeName}${safeGrade ? `, a ${safeGrade} student` : ''}.`
    : SYSTEM_PROMPT;

  const client = new Anthropic({ apiKey });

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        ...CORS_HEADERS,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An error occurred.';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
