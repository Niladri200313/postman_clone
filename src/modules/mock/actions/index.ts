"use server";

import db from "@/lib/db";
import { currentUser } from "@/modules/authentication/actions";
import { REST_METHOD } from "@prisma/client";

// ─── MOCK SERVER CRUD ─────────────────────────────────────────────────────────

export async function getMockServers(workspaceId: string) {
  if (!workspaceId) return [];
  return db.mockServer.findMany({
    where: { workspaceId },
    include: { endpoints: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMockServer(workspaceId: string, name: string, prefix: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const slug = prefix
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return db.mockServer.create({
    data: { workspaceId, name, prefix: slug },
    include: { endpoints: true },
  });
}

export async function deleteMockServer(serverId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return db.mockServer.delete({ where: { id: serverId } });
}

// ─── MOCK ENDPOINT CRUD ───────────────────────────────────────────────────────

export async function createMockEndpoint(
  mockServerId: string,
  path: string,
  method: REST_METHOD,
  description?: string,
  initialData?: Record<string, unknown>[]
) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return db.mockEndpoint.create({
    data: {
      mockServerId,
      path: normalizedPath,
      method,
      description,
      dataStore: initialData ?? [],
    },
  });
}

export async function deleteMockEndpoint(endpointId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return db.mockEndpoint.delete({ where: { id: endpointId } });
}

export async function clearMockEndpointData(endpointId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const target = await db.mockEndpoint.findUnique({
    where: { id: endpointId },
    include: { mockServer: { include: { endpoints: true } } },
  });

  if (!target) throw new Error("Endpoint not found");

  const basePath = "/" + (target.path.split("/").filter(Boolean)[0] || "");
  const siblingIds = target.mockServer.endpoints
    .filter((ep) => ("/" + (ep.path.split("/").filter(Boolean)[0] || "")) === basePath)
    .map((ep) => ep.id);

  return db.mockEndpoint.updateMany({
    where: { id: { in: siblingIds.length > 0 ? siblingIds : [endpointId] } },
    data: { dataStore: [] },
  });
}

// ─── AI SEED DATA GENERATOR ───────────────────────────────────────────────────

function generateFallbackData(prompt: string): Record<string, unknown>[] {
  const p = prompt.toLowerCase();

  if (p.includes("product") || p.includes("item") || p.includes("shop") || p.includes("ecommerce") || p.includes("store")) {
    return [
      { id: "prod_001", name: "Wireless Noise-Canceling Headphones", price: 149.99, category: "Electronics", inStock: true, rating: 4.8 },
      { id: "prod_002", name: "Mechanical Gaming Keyboard", price: 89.99, category: "Electronics", inStock: true, rating: 4.6 },
      { id: "prod_003", name: "Ergonomic Office Chair", price: 299.0, category: "Furniture", inStock: false, rating: 4.5 },
      { id: "prod_004", name: "Stainless Steel Water Bottle", price: 24.5, category: "Fitness", inStock: true, rating: 4.9 },
      { id: "prod_005", name: "Ultra-Wide 34-inch Monitor", price: 499.99, category: "Electronics", inStock: true, rating: 4.7 },
      { id: "prod_006", name: "Leather Laptop Backpack", price: 79.0, category: "Accessories", inStock: true, rating: 4.4 },
    ];
  }

  if (p.includes("order") || p.includes("invoice") || p.includes("checkout") || p.includes("cart") || p.includes("payment")) {
    return [
      { id: "ord_101", orderNumber: "ORD-2026-001", customer: "Sophia Martinez", totalAmount: 239.98, status: "DELIVERED", itemsCount: 3, createdAt: "2026-03-20T10:30:00Z" },
      { id: "ord_102", orderNumber: "ORD-2026-002", customer: "Liam Johnson", totalAmount: 49.99, status: "PROCESSING", itemsCount: 1, createdAt: "2026-03-21T14:15:00Z" },
      { id: "ord_103", orderNumber: "ORD-2026-003", customer: "Emma Watson", totalAmount: 512.4, status: "SHIPPED", itemsCount: 5, createdAt: "2026-03-22T09:00:00Z" },
      { id: "ord_104", orderNumber: "ORD-2026-004", customer: "Noah Davis", totalAmount: 89.0, status: "PENDING", itemsCount: 2, createdAt: "2026-03-23T16:45:00Z" },
    ];
  }

  if (p.includes("post") || p.includes("article") || p.includes("blog") || p.includes("feed")) {
    return [
      { id: "post_01", title: "Getting Started with Modern API Development", author: "Devon Lane", tags: ["tech", "api", "web"], likes: 42, published: true },
      { id: "post_02", title: "Top 10 Productivity Tips for Remote Engineers", author: "Sara Connor", tags: ["career", "remote"], likes: 88, published: true },
      { id: "post_03", title: "Understanding Stateful Mock Servers in 2026", author: "Alex Rivers", tags: ["testing", "devops"], likes: 115, published: true },
      { id: "post_04", title: "Microservices vs Monoliths: A Fair Retrospective", author: "Marcus Vance", tags: ["architecture"], likes: 67, published: false },
    ];
  }

  if (p.includes("task") || p.includes("todo") || p.includes("project") || p.includes("issue")) {
    return [
      { id: "tsk_01", title: "Implement OAuth2 Token Refresh", priority: "HIGH", status: "IN_PROGRESS", assignee: "Alex Chen", dueDate: "2026-04-01" },
      { id: "tsk_02", title: "Fix CORS preflight headers on mock routes", priority: "CRITICAL", status: "DONE", assignee: "Elena Rostova", dueDate: "2026-03-28" },
      { id: "tsk_03", title: "Design settings page dark mode", priority: "MEDIUM", status: "TODO", assignee: "Jordan Taylor", dueDate: "2026-04-05" },
      { id: "tsk_04", title: "Optimize Postgres connection pool queries", priority: "LOW", status: "TODO", assignee: "Dev Team", dueDate: "2026-04-10" },
    ];
  }

  // Default realistic users/people dataset
  return [
    { id: "usr_001", name: "Alex Rivera", email: "alex.rivera@example.com", role: "ADMIN", status: "ACTIVE", department: "Engineering" },
    { id: "usr_002", name: "Samantha Cole", email: "sam.cole@example.com", role: "DEVELOPER", status: "ACTIVE", department: "Frontend" },
    { id: "usr_003", name: "Michael Chang", email: "m.chang@example.com", role: "PRODUCT_MANAGER", status: "ACTIVE", department: "Product" },
    { id: "usr_004", name: "Jessica Taylor", email: "jessica.t@example.com", role: "DESIGNER", status: "INACTIVE", department: "UI/UX" },
    { id: "usr_005", name: "David Kim", email: "david.kim@example.com", role: "QA_ENGINEER", status: "ACTIVE", department: "Quality" },
  ];
}

export async function seedMockEndpointWithAI(
  endpointId: string,
  prompt: string
) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  let parsed: unknown[] | null = null;

  // 1. Primary AI Engine: Mistral AI via LangGraph
  try {
    const { runMistralLangGraphSeeder } = await import("@/lib/mistral-langgraph-seeder");
    const mistralRecords = await runMistralLangGraphSeeder(prompt);
    if (Array.isArray(mistralRecords) && mistralRecords.length > 0) {
      parsed = mistralRecords;
    }
  } catch (mistralErr: any) {
    console.warn("[AI Seed] Mistral LangGraph seeder note:", mistralErr?.message || mistralErr);
  }

  // 2. Secondary Engine: Gemini multi-model cascade (if Mistral was unavailable or key missing)
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    const candidateModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash"];

    try {
      const { generateText } = await import("ai");
      const { google } = await import("@ai-sdk/google");

      for (const modelName of candidateModels) {
        try {
          const { text } = await generateText({
            model: google(modelName),
            maxRetries: 1,
            prompt: `Generate a realistic JSON array of 5-8 records for an API mock endpoint.
Context: ${prompt}

IMPORTANT RULES:
1. Return ONLY a valid JSON array, no markdown fences, no explanation text.
2. Each record must have a unique "id" field (string, use short readable IDs like "rec_001").
3. Use realistic dummy data with appropriate types (numbers for prices, booleans for status, strings for names).
4. Keep it concise: between 5 and 8 records.

Example output:
[{"id":"rec_001","name":"Sample","active":true}]`,
          });

          const cleaned = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          const candidate = JSON.parse(cleaned);
          if (Array.isArray(candidate) && candidate.length > 0) {
            parsed = candidate;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`[AI Seed] Model ${modelName} unavailable:`, modelErr?.message || modelErr);
        }
      }
    } catch (err: any) {
      console.warn("[AI Seed] Google AI fallback failed:", err?.message || err);
    }
  }

  // 3. Fallback: Smart Semantic Generator (prevents 500 crashes if all cloud providers are busy)
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    console.info("[AI Seed] Using Smart Semantic Fallback generator for prompt:", prompt);
    parsed = generateFallbackData(prompt);
  }

  const target = await db.mockEndpoint.findUnique({
    where: { id: endpointId },
    include: { mockServer: { include: { endpoints: true } } },
  });

  if (target) {
    const basePath = "/" + (target.path.split("/").filter(Boolean)[0] || "");
    const siblingIds = target.mockServer.endpoints
      .filter((ep) => ("/" + (ep.path.split("/").filter(Boolean)[0] || "")) === basePath)
      .map((ep) => ep.id);

    await db.mockEndpoint.updateMany({
      where: { id: { in: siblingIds.length > 0 ? siblingIds : [endpointId] } },
      data: { dataStore: parsed as any },
    });
    return target;
  }

  return db.mockEndpoint.update({
    where: { id: endpointId },
    data: { dataStore: parsed as any },
  });
}

