"use client";

import React, { useState, useMemo } from "react";
import { Code, Copy, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRequestPlaygroundStore } from "@/modules/request/store/useRequestStore";
import { toast } from "sonner";

type Language = "curl" | "fetch" | "axios" | "python" | "go";

const LANGUAGES: { id: Language; label: string; icon: string }[] = [
  { id: "curl", label: "cURL", icon: "🔧" },
  { id: "fetch", label: "Fetch (JS)", icon: "🌐" },
  { id: "axios", label: "Axios", icon: "⚡" },
  { id: "python", label: "Python (requests)", icon: "🐍" },
  { id: "go", label: "Go (net/http)", icon: "🚀" },
];

function parseHeaders(raw?: string): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Object.fromEntries(
        parsed
          .filter((h: any) => h.enabled !== false && h.key)
          .map((h: any) => [h.key, h.value])
      );
    }
    return parsed;
  } catch {
    return {};
  }
}

function parseBody(raw?: string): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function generateCurl(method: string, url: string, headers: Record<string, string>, body: any): string {
  const lines: string[] = [`curl -X ${method.toUpperCase()} '${url}'`];
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  -H '${key}: ${value}'`);
  }
  if (body !== null && method !== "GET") {
    lines.push(`  -d '${typeof body === "string" ? body : JSON.stringify(body)}'`);
  }
  return lines.join(" \\\n");
}

function generateFetch(method: string, url: string, headers: Record<string, string>, body: any): string {
  const opts: string[] = [`  method: '${method.toUpperCase()}'`];
  if (Object.keys(headers).length > 0) {
    opts.push(`  headers: ${JSON.stringify(headers, null, 4).split("\n").join("\n  ")}`);
  }
  if (body !== null && method !== "GET") {
    if (typeof body === "string") {
      opts.push(`  body: ${JSON.stringify(body)}`);
    } else {
      opts.push(`  body: JSON.stringify(${JSON.stringify(body, null, 4).split("\n").join("\n  ")})`);
    }
  }
  return `fetch('${url}', {\n${opts.join(",\n")}\n})\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
}

function generateAxios(method: string, url: string, headers: Record<string, string>, body: any): string {
  const config: any = { url, method: method.toLowerCase() };
  if (Object.keys(headers).length > 0) config.headers = headers;
  if (body !== null && method !== "GET") config.data = body;

  return `import axios from 'axios';\n\naxios(${JSON.stringify(config, null, 2)})\n  .then(response => console.log(response.data))\n  .catch(error => console.error(error));`;
}

function generatePython(method: string, url: string, headers: Record<string, string>, body: any): string {
  const lines: string[] = ["import requests", ""];
  if (Object.keys(headers).length > 0) {
    lines.push(`headers = ${JSON.stringify(headers, null, 4)}`);
  }
  if (body !== null && method !== "GET") {
    if (typeof body === "string") {
      lines.push(`payload = ${JSON.stringify(body)}`);
    } else {
      lines.push(`payload = ${JSON.stringify(body, null, 4)}`);
    }
  }
  const args = [`'${url}'`];
  if (Object.keys(headers).length > 0) args.push("headers=headers");
  if (body !== null && method !== "GET") {
    args.push(typeof body === "string" ? "data=payload" : "json=payload");
  }
  lines.push("");
  lines.push(`response = requests.${method.toLowerCase()}(${args.join(", ")})`);
  lines.push("print(response.status_code, response.json())");
  return lines.join("\n");
}

function generateGo(method: string, url: string, headers: Record<string, string>, body: any): string {
  const lines: string[] = [
    'package main',
    '',
    'import (',
    '  "fmt"',
    '  "net/http"',
    body && method !== "GET" ? '  "strings"' : '',
    ')',
    '',
    'func main() {',
  ];

  if (body && method !== "GET") {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    lines.push(`  payload := strings.NewReader(\`${bodyStr}\`)`);
    lines.push(`  req, err := http.NewRequest("${method.toUpperCase()}", "${url}", payload)`);
  } else {
    lines.push(`  req, err := http.NewRequest("${method.toUpperCase()}", "${url}", nil)`);
  }

  for (const [key, val] of Object.entries(headers)) {
    lines.push(`  req.Header.Set("${key}", "${val}")`);
  }
  lines.push('  if err != nil {');
  lines.push('    fmt.Println(err)');
  lines.push('    return');
  lines.push('  }');
  lines.push('  res, err := http.DefaultClient.Do(req)');
  lines.push('  if err != nil {');
  lines.push('    fmt.Println(err)');
  lines.push('    return');
  lines.push('  }');
  lines.push('  defer res.Body.Close()');
  lines.push('  fmt.Println(res.Status)');
  lines.push('}');

  return lines.filter(Boolean).join("\n");
}

const CodePanel = () => {
  const { tabs, activeTabId } = useRequestPlaygroundStore();
  const [language, setLanguage] = useState<Language>("curl");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const selectedLang = LANGUAGES.find((l) => l.id === language)!;

  const snippet = useMemo(() => {
    if (!activeTab) return "// No active request tab found.";
    const headers = parseHeaders(activeTab.headers);
    const body = parseBody(activeTab.body);
    const method = activeTab.method || "GET";
    const url = activeTab.url || "https://example.com";

    switch (language) {
      case "curl": return generateCurl(method, url, headers, body);
      case "fetch": return generateFetch(method, url, headers, body);
      case "axios": return generateAxios(method, url, headers, body);
      case "python": return generatePython(method, url, headers, body);
      case "go": return generateGo(method, url, headers, body);
      default: return "";
    }
  }, [activeTab, language]);

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Code snippet copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium">Code Generator</span>
        </div>
      </div>

      <div className="p-3 border-b border-zinc-800 space-y-2">
        {/* Language selector */}
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Language</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <span>{selectedLang.icon} {selectedLang.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute z-10 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => { setLanguage(lang.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                    language === lang.id
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {lang.icon} {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active tab info */}
        {activeTab && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-2">
            <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
              {activeTab.method}
            </span>
            <span className="truncate font-mono text-zinc-400">{activeTab.url || "No URL"}</span>
          </div>
        )}
      </div>

      {/* Code output */}
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Generated Snippet</span>
          <button
            onClick={copySnippet}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors p-1.5 rounded hover:bg-zinc-800"
            title="Copy to clipboard"
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy</>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-zinc-900 border border-zinc-700/80 rounded-lg min-h-0">
          <pre className="p-3 text-[11px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap break-words">
            {snippet}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CodePanel;
