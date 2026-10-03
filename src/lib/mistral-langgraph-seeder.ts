/**
 * Mistral AI + LangGraph Seed Data Workflow
 *
 * Architecture:
 * 1. StateGraph: defines workflow state (prompt, schemaPlan, rawJson, records)
 * 2. Node: schemaPlanner (Mistral determines optimal schema and fields)
 * 3. Node: dataSynthesizer (Mistral generates realistic, high-entropy records)
 * 4. Node: validatorAndNormalizer (ensures valid JSON array, adds unique IDs)
 */

export interface SeedState {
  prompt: string;
  schemaPlan?: string;
  rawJson?: string;
  records: Record<string, unknown>[];
  error?: string | null;
}

// ─── Direct Mistral API helper (HTTP fallback if LangGraph packages not yet compiled) ────
async function callMistralAPI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  model: string = "mistral-small-latest"
): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral API Error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

// ─── LangGraph Implementation ───────────────────────────────────────────────
export async function runMistralLangGraphSeeder(
  prompt: string,
  apiKey?: string
): Promise<Record<string, unknown>[]> {
  const mistralKey = apiKey || process.env.MISTRAL_API_KEY;

  if (!mistralKey) {
    throw new Error(
      "MISTRAL_API_KEY is not defined. Please add MISTRAL_API_KEY=your_key to your .env file."
    );
  }

  // Attempt to use installed @langchain/langgraph and @langchain/mistralai
  try {
    const { StateGraph, Annotation, END, START } = await import(
      "@langchain/langgraph"
    );
    const { ChatMistralAI } = await import("@langchain/mistralai");
    const { HumanMessage, SystemMessage } = await import(
      "@langchain/core/messages"
    );

    const model = new ChatMistralAI({
      apiKey: mistralKey,
      model: "mistral-small-latest",
      temperature: 0.7,
    });

    const GraphAnnotation = Annotation.Root({
      prompt: Annotation<string>(),
      schemaPlan: Annotation<string>(),
      rawJson: Annotation<string>(),
      records: Annotation<Record<string, unknown>[]>(),
      error: Annotation<string | null>(),
    });

    // Node 1: Schema Planner
    const planSchema = async (state: typeof GraphAnnotation.State) => {
      const response = await model.invoke([
        new SystemMessage(
          "You are an expert database architect. Analyze the user request and describe a clean JSON schema for an API endpoint dataset. Return a concise JSON summary of fields and types."
        ),
        new HumanMessage(`Requirements: ${state.prompt}`),
      ]);
      return { schemaPlan: String(response.content) };
    };

    // Node 2: Data Synthesizer
    const synthesizeData = async (state: typeof GraphAnnotation.State) => {
      const response = await model.invoke([
        new SystemMessage(
          `You are a synthetic data generator. Based on the schema plan, generate a realistic JSON array of 5 to 8 records.
IMPORTANT RULES:
1. Return ONLY a valid JSON object with a "records" array: {"records": [{...}, {...}]}
2. Each record MUST have a unique "id" (short string, e.g. "rec_001").
3. Use realistic, production-quality data (real looking names, dates, amounts, etc.).`
        ),
        new HumanMessage(
          `Schema Plan: ${state.schemaPlan}\nOriginal Context: ${state.prompt}`
        ),
      ]);
      return { rawJson: String(response.content) };
    };

    // Node 3: Validator & Normalizer
    const validateData = (state: typeof GraphAnnotation.State) => {
      try {
        const cleaned = (state.rawJson || "")
          .trim()
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");

        const parsed = JSON.parse(cleaned);
        const list = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.records)
          ? parsed.records
          : Object.values(parsed).find(Array.isArray) ?? [];

        const normalized = (list as Record<string, unknown>[]).map(
          (item, idx) => ({
            id: item.id || `rec_${String(idx + 1).padStart(3, "0")}`,
            ...item,
          })
        );

        return { records: normalized, error: null };
      } catch (e: any) {
        return { records: [], error: e.message };
      }
    };

    // Build the LangGraph StateGraph
    const workflow = new StateGraph(GraphAnnotation)
      .addNode("planner", planSchema)
      .addNode("generator", synthesizeData)
      .addNode("validator", validateData)
      .addEdge(START, "planner")
      .addEdge("planner", "generator")
      .addEdge("generator", "validator")
      .addEdge("validator", END);

    const app = workflow.compile();
    const result = await app.invoke({
      prompt,
      records: [],
      error: null,
    });

    if (result.records && result.records.length > 0) {
      return result.records;
    }
  } catch (langgraphError: any) {
    console.warn(
      "[Mistral LangGraph] Falling back to direct Mistral pipeline:",
      langgraphError?.message || langgraphError
    );
  }

  // Fallback: Direct Mistral API Multi-step execution
  const rawResponse = await callMistralAPI(mistralKey, [
    {
      role: "system",
      content:
        'You are an expert synthetic data generator. Generate 5-8 realistic JSON records matching the user prompt. Return ONLY JSON with format: {"records": [{"id": "rec_001", ...}]}',
    },
    {
      role: "user",
      content: `Generate realistic mock data for: ${prompt}`,
    },
  ]);

  const parsed = JSON.parse(rawResponse);
  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.records)
    ? parsed.records
    : Object.values(parsed).find(Array.isArray) ?? [];

  return (items as Record<string, unknown>[]).map((item, idx) => ({
    id: item.id || `rec_${String(idx + 1).padStart(3, "0")}`,
    ...item,
  }));
}
