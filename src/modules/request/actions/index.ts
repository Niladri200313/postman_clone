"use server";

import db from "@/lib/db";
import { REST_METHOD } from "@prisma/client";

import axios, { AxiosRequestConfig } from "axios";

export type Request= {
  name: string;
  method: REST_METHOD;
  url: string;
  body?: string;
  headers?: string;
  parameters?: string;
};


export const addRequestToCollection = async (collectionId:string , value:Request)=>{
  const request = await db.request.create({
    data:{
        collectionId,
        name: value.name,
        method: value.method,
        url: value.url,
        body: value.body,
        headers: value.headers,
        parameters: value.parameters,
    }
  });

  return request;
}



export const saveRequest = async (id:string, value:Request)=>{

  console.log(value , id);
const request =  await db.request.update({
    where: {
      id: id
    },
    data: {
      name: value.name,
      method: value.method,
      url: value.url,
      body: value.body,
      headers: value.headers,
      parameters: value.parameters,
    },
  });

  return request;
}

export const getAllRequestFromCollection = async (collectionId:string)=>{
  const requests = await db.request.findMany({
    where: {
      collectionId,
    },
  });
  return requests;
}

export const deleteRequest = async (id: string) => {
  return await db.request.delete({
    where: { id },
  });
};



export async function sendRequest(req: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
}) {
  const requestHeaders = { ...(req.headers || {}) };
  if (req.body !== undefined && !requestHeaders["Content-Type"] && !requestHeaders["content-type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const config: AxiosRequestConfig = {
    method: req.method,
    url: req.url,
    headers: requestHeaders,
    params: req.params,
    data: req.body,
    validateStatus: () => true, // ✅ capture errors too
  };

  const start = performance.now();
  try {
    const res = await axios(config);
    const end = performance.now();

    const duration = end - start;
    const size =
      res.headers["content-length"] ||
      new TextEncoder().encode(JSON.stringify(res.data)).length;

    console.log(res.data);
    
    return {
      status: res.status,        
      statusText: res.statusText, 
        headers: Object.fromEntries(Object.entries(res.headers)),      
      data: res.data,            
      duration: Math.round(duration),
      size,
    };
  } catch (error: any) {
    const end = performance.now();
    return {
      error: error.message,
      duration: Math.round(end - start),
    };
  }
}


function parseKeyValueMap(input?: any): Record<string, string> {
  if (!input) return {};
  if (typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, string>;
  }
  let list: any[] = [];
  if (typeof input === "string") {
    try {
      list = JSON.parse(input);
    } catch {
      return {};
    }
  } else if (Array.isArray(input)) {
    list = input;
  }
  const result: Record<string, string> = {};
  if (Array.isArray(list)) {
    for (const item of list) {
      if (item && item.enabled !== false && item.key) {
        result[item.key] = item.value ?? "";
      }
    }
  }
  return result;
}

function parseJsonBody(body?: any) {
  if (!body) return undefined;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

export async function executeTabRequest(data: {
  requestId?: string;
  method: string;
  url: string;
  headers?: any;
  parameters?: any;
  body?: any;
}) {
  const headers = parseKeyValueMap(data.headers);
  const params = parseKeyValueMap(data.parameters);
  const body = parseJsonBody(data.body);

  const requestConfig = {
    method: data.method || "GET",
    url: data.url,
    headers,
    params,
    body,
  };

  const result = await sendRequest(requestConfig);

  let requestRun = null;
  if (data.requestId) {
    try {
      const existing = await db.request.findUnique({
        where: { id: data.requestId },
      });
      if (existing) {
        requestRun = await db.requestRun.create({
          data: {
            requestId: data.requestId,
            status: result.status || 0,
            statusText: result.statusText || (result.error ? "Error" : null),
            headers: result.headers || {},
            body: result.data ? (typeof result.data === "string" ? result.data : JSON.stringify(result.data)) : null,
            durationMs: result.duration || 0,
          },
        });

        if (result.data && !result.error) {
          await db.request.update({
            where: { id: data.requestId },
            data: {
              response: result.data,
              updatedAt: new Date(),
            },
          });
        }
      }
    } catch (e) {
      console.warn("Could not persist request run to DB:", e);
    }
  }

  if (!requestRun) {
    requestRun = {
      id: `run_${Date.now()}`,
      status: result.status || 0,
      statusText: result.statusText || (result.error ? "Error" : "OK"),
      headers: result.headers || {},
      body: result.data ?? result.error ?? null,
      durationMs: result.duration || 0,
    };
  }

  return {
    success: !result.error,
    requestRun,
    result,
    error: result.error,
  };
}

export async function run(requestId: string) {
  if (!requestId || typeof requestId !== "string" || !requestId.trim()) {
    return {
      success: false,
      error: "No requestId provided. Please save the request first or send via active tab.",
    };
  }

  try {
    const request = await db.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error(`Request with id ${requestId} not found`);
    }

    const headers = parseKeyValueMap(request.headers);
    const params = parseKeyValueMap(request.parameters);
    const body = parseJsonBody(request.body);

    const requestConfig = {
      method: request.method,
      url: request.url,
      headers,
      params,
      body,
    };

    const result = await sendRequest(requestConfig);

    const requestRun = await db.requestRun.create({
      data: {
        requestId: request.id,
        status: result.status || 0,
        statusText: result.statusText || (result.error ? "Error" : null),
        headers: result.headers || "",
        body: result.data
          ? typeof result.data === "string"
            ? result.data
            : JSON.stringify(result.data)
          : null,
        durationMs: result.duration || 0,
      },
    });

    if (result.data && !result.error) {
      await db.request.update({
        where: { id: request.id },
        data: {
          response: result.data,
          updatedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      requestRun,
      result,
    };
  } catch (error: any) {
    try {
      if (requestId) {
        const failedRun = await db.requestRun.create({
          data: {
            requestId,
            status: 0,
            statusText: "Failed",
            headers: "",
            body: error.message,
            durationMs: 0,
          },
        });

        return {
          success: false,
          error: error.message,
          requestRun: failedRun,
        };
      }
    } catch {
      // ignore foreign key failure
    }

    return {
      success: false,
      error: error.message,
      requestRun: {
        id: `failed_${Date.now()}`,
        status: 0,
        statusText: "Failed",
        headers: {},
        body: error.message,
        durationMs: 0,
      },
    };
  }
}


export async function runDirect(requestData: {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  parameters?: Record<string, any>;
  body?: any;
}) {
  try {
    const headers = parseKeyValueMap(requestData.headers);
    const params = parseKeyValueMap(requestData.parameters);
    const body = parseJsonBody(requestData.body);

    const requestConfig = {
      method: requestData.method,
      url: requestData.url,
      headers,
      params,
      body,
    };

    const result = await sendRequest(requestConfig);

    const requestRun = await db.requestRun.create({
      data: {
        requestId: requestData.id,
        status: result.status || 0,
        statusText: result.statusText || (result.error ? 'Error' : null),
        headers: result.headers || "",
        body: result.data ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data)) : null,
        durationMs: result.duration || 0
      }
    });

    // Update request with latest response if successful
    if (result.data && !result.error) {
      await db.request.update({
        where: { id: requestData.id },
        data: {
          response: result.data,
          updatedAt: new Date()
        }
      });
    }

    return {
      success: true,
      requestRun,
      result
    };

  } catch (error: any) {
    const failedRun = await db.requestRun.create({
      data: {
        requestId: requestData.id,
        status: 0,
        statusText: 'Failed',
        headers: "",
        body: error.message,
        durationMs: 0
      }
    });

    return {
      success: false,
      error: error.message,
      requestRun: failedRun
    };
  }
}