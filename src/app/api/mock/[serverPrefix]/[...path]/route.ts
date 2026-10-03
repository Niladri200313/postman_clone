import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { REST_METHOD } from "@prisma/client";

type Params = { params: Promise<{ serverPrefix: string; path: string[] }> };

// Helper: match a route pattern like "/products/:id" or "/products/{id}" against "/products/123"
function matchRoute(
  pattern: string,
  incoming: string
): { matched: boolean; params: Record<string, string> } {
  const patternParts = pattern.split("/").filter(Boolean);
  const incomingParts = incoming.split("/").filter(Boolean);

  if (patternParts.length !== incomingParts.length) {
    return { matched: false, params: {} };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = incomingParts[i];
    } else if (p.startsWith("{") && p.endsWith("}")) {
      params[p.slice(1, -1)] = incomingParts[i];
    } else if (p !== incomingParts[i]) {
      return { matched: false, params: {} };
    }
  }
  return { matched: true, params };
}

// Helper: get base collection name (e.g. "/products/123" -> "/products")
function getResourceBasePath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  return "/" + parts[0];
}

// Safe body extractor: handles JSON, raw text, and empty bodies without throwing
async function extractRequestBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text || text.trim() === "") {
      return {};
    }
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    if (Array.isArray(parsed)) {
      return { items: parsed };
    }
    return { value: parsed };
  } catch {
    return {};
  }
}

async function handler(req: NextRequest, { params }: Params) {
  const { serverPrefix, path } = await params;
  const incomingPath = "/" + (path?.join("/") ?? "");
  const method = req.method as REST_METHOD;

  // 1. Find the mock server by prefix
  const mockServer = await db.mockServer.findUnique({
    where: { prefix: serverPrefix },
    include: { endpoints: true },
  });

  if (!mockServer) {
    return NextResponse.json(
      { error: `Mock server '${serverPrefix}' not found` },
      { status: 404 }
    );
  }

  // 2. Simulate configured latency
  if (mockServer.latencyMs > 0) {
    await new Promise((r) => setTimeout(r, mockServer.latencyMs));
  }

  // 3. Simulate configured chaos error rate
  if (mockServer.errorRate > 0 && Math.random() < mockServer.errorRate) {
    return NextResponse.json(
      { error: "Simulated server error (chaos mode)" },
      { status: 500 }
    );
  }

  // 4. Find matching endpoint & path parameters
  let matchedEndpoint: (typeof mockServer.endpoints)[0] | null = null;
  let pathParams: Record<string, string> = {};

  // Exact match attempt
  for (const endpoint of mockServer.endpoints) {
    if (endpoint.method !== method) continue;
    const result = matchRoute(endpoint.path, incomingPath);
    if (result.matched) {
      matchedEndpoint = endpoint;
      pathParams = result.params;
      break;
    }
  }

  const incomingParts = incomingPath.split("/").filter(Boolean);
  const resourceBase = getResourceBasePath(incomingPath);

  // Fallback 1: sub-resource ID fallback (e.g. /products/rec_123)
  if (!matchedEndpoint && incomingParts.length >= 2) {
    const parent = mockServer.endpoints.find(
      (ep) => getResourceBasePath(ep.path) === resourceBase
    );
    if (parent) {
      matchedEndpoint = parent;
      pathParams = { id: incomingParts[incomingParts.length - 1] };
    }
  }

  // Fallback 2: method fallback on base resource
  if (!matchedEndpoint) {
    const parent = mockServer.endpoints.find(
      (ep) => getResourceBasePath(ep.path) === resourceBase
    );
    if (parent) {
      matchedEndpoint = parent;
      if (incomingParts.length >= 2) {
        pathParams = { id: incomingParts[incomingParts.length - 1] };
      }
    }
  }

  if (!matchedEndpoint) {
    return NextResponse.json(
      {
        error: `No mock endpoint found for ${method} ${incomingPath}`,
        hint: `Register an endpoint matching '${incomingPath}' on mock server '${serverPrefix}'.`,
      },
      { status: 404 }
    );
  }

  // 5. Robust target ID extraction
  const targetId =
    pathParams.id ||
    Object.values(pathParams)[0] ||
    (incomingParts.length >= 2 ? incomingParts[incomingParts.length - 1] : undefined);

  // 6. Unified Resource Store: Sibling endpoints for the same resource share the same dataStore
  const siblingEndpoints = mockServer.endpoints.filter(
    (ep) => getResourceBasePath(ep.path) === resourceBase
  );
  const siblingIds = siblingEndpoints.map((ep) => ep.id);

  let activeDataStore: Record<string, unknown>[] = [];
  const seedOwner = siblingEndpoints.find(
    (ep) => Array.isArray(ep.dataStore) && (ep.dataStore as any[]).length > 0
  );

  if (seedOwner && Array.isArray(seedOwner.dataStore)) {
    activeDataStore = [...(seedOwner.dataStore as Record<string, unknown>[])];
  } else if (Array.isArray(matchedEndpoint.dataStore)) {
    activeDataStore = [...(matchedEndpoint.dataStore as Record<string, unknown>[])];
  }

  const persistStore = async (newStore: Record<string, unknown>[]) => {
    if (siblingIds.length > 0) {
      await db.mockEndpoint.updateMany({
        where: { id: { in: siblingIds } },
        data: { dataStore: newStore as any },
      });
    }
  };

  // ─── GET /resource or GET /resource/:id ────────────────────────────────────
  if (method === "GET") {
    if (targetId) {
      const record = activeDataStore.find(
        (r) => String(r.id).toLowerCase() === targetId.toLowerCase()
      );
      if (!record) {
        return NextResponse.json(
          { error: `Record with id '${targetId}' not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(record, { status: 200 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "100");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const sliced = activeDataStore.slice(offset, offset + limit);
    return NextResponse.json(sliced, { status: 200 });
  }

  // ─── POST /resource — create new record ───────────────────────────────────
  if (method === "POST") {
    const body = await extractRequestBody(req);

    const newRecord = {
      id: body.id ? String(body.id) : `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...body,
    };

    const updatedStore = [...activeDataStore, newRecord];
    await persistStore(updatedStore);

    return NextResponse.json(
      { success: true, record: newRecord },
      { status: 201 }
    );
  }

  // ─── PUT /resource/:id — full replace ─────────────────────────────────────
  if (method === "PUT") {
    if (!targetId) {
      return NextResponse.json({ error: "Missing record ID in URL" }, { status: 400 });
    }

    const body = await extractRequestBody(req);
    const idx = activeDataStore.findIndex(
      (r) => String(r.id).toLowerCase() === targetId.toLowerCase()
    );
    if (idx === -1) {
      return NextResponse.json(
        { error: `Record with id '${targetId}' not found` },
        { status: 404 }
      );
    }

    const updated = { ...body, id: targetId, updatedAt: new Date().toISOString() };
    activeDataStore[idx] = updated;
    await persistStore(activeDataStore);

    return NextResponse.json(updated, { status: 200 });
  }

  // ─── PATCH /resource/:id — partial update ─────────────────────────────────
  if (method === "PATCH") {
    if (!targetId) {
      return NextResponse.json({ error: "Missing record ID in URL" }, { status: 400 });
    }

    const body = await extractRequestBody(req);
    const idx = activeDataStore.findIndex(
      (r) => String(r.id).toLowerCase() === targetId.toLowerCase()
    );
    if (idx === -1) {
      return NextResponse.json(
        { error: `Record with id '${targetId}' not found` },
        { status: 404 }
      );
    }

    const merged = { ...activeDataStore[idx], ...body, updatedAt: new Date().toISOString() };
    activeDataStore[idx] = merged;
    await persistStore(activeDataStore);

    return NextResponse.json(
      { success: true, record: merged },
      { status: 200 }
    );
  }

  // ─── DELETE /resource/:id — remove record ─────────────────────────────────
  if (method === "DELETE") {
    if (targetId) {
      const idx = activeDataStore.findIndex(
        (r) => String(r.id).toLowerCase() === targetId.toLowerCase()
      );
      if (idx === -1) {
        return NextResponse.json(
          { error: `Record with id '${targetId}' not found` },
          { status: 404 }
        );
      }

      const deleted = activeDataStore[idx];
      activeDataStore.splice(idx, 1);
      await persistStore(activeDataStore);

      return NextResponse.json(
        { success: true, deleted, message: "Record deleted successfully" },
        { status: 200 }
      );
    } else {
      // Clear all records
      await persistStore([]);
      return NextResponse.json(
        { success: true, message: "All records deleted successfully" },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ error: "Unsupported operation" }, { status: 405 });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
