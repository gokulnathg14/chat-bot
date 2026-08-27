import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  extractTextFromPdfBuffer,
  generateGroundedResponse,
  generateDynamicFlashcards,
  generateDynamicQuiz,
  generateIntelligentEmailDigest,
} from "./server/groundedEngine";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload limit for file/image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ============================================================================
// GEMINI CLIENT & MODEL CONFIGURATION
// ============================================================================

let cachedGenAIClient: GoogleGenAI | null = null;
let authBlocked = false;

function getGeminiClient(): GoogleGenAI | null {
  if (authBlocked) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }

  if (!cachedGenAIClient) {
    cachedGenAIClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return cachedGenAIClient;
}

const MODEL_CANDIDATES = [
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

async function executeGeminiWithFallback(params: {
  contents: string;
  systemInstruction?: string;
  responseSchema?: any;
}): Promise<{ text: string; modelUsed: string }> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("GEMINI_CLIENT_UNAVAILABLE: API key is not configured.");
  }

  let lastError: unknown = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const config: {
        systemInstruction?: string;
        responseMimeType?: string;
        responseSchema?: any;
      } = {};

      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = params.responseSchema;
      }

      const response = await client.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: unknown) {
      lastError = err;
      const errorMsg = String(err instanceof Error ? err.message : err);
      if (errorMsg.includes("403") || errorMsg.includes("PERMISSION_DENIED")) {
        authBlocked = true;
        break;
      }
    }
  }

  throw lastError || new Error("All candidate Gemini models failed.");
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    isGeminiConfigured: Boolean(process.env.GEMINI_API_KEY) && !authBlocked,
  });
});

// File parser endpoint (extracts text from PDF, Text, Markdown)
app.post("/api/study/extract-file", async (req, res) => {
  try {
    const { fileName, base64Data, mimeType } = req.body || {};
    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data for file extraction" });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    let extractedText = "";
    const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";

    if (ext === "pdf" || mimeType === "application/pdf") {
      extractedText = await extractTextFromPdfBuffer(buffer);
    } else {
      extractedText = buffer.toString("utf-8");
    }

    if (!extractedText.trim()) {
      extractedText = `[File: ${fileName || "Uploaded document"} - (Content processed as structured academic document)]`;
    }

    return res.json({
      text: extractedText,
      charCount: extractedText.length,
      wordCount: extractedText.trim().split(/\s+/).length,
    });
  } catch (err: unknown) {
    console.error("Error in /api/study/extract-file:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to extract text from file",
    });
  }
});

// 1. Study Chat Agent Endpoint (Grounded QA)
app.post("/api/study/chat", async (req, res) => {
  const { messages, materials, mode = "qa" } = req.body || {};
  const validMessages = Array.isArray(messages) ? messages : [];
  const lastMessage = validMessages[validMessages.length - 1] || { text: "Explain key concepts" };
  const validMaterials = Array.isArray(materials) ? materials : [];

  try {
    if (!authBlocked && getGeminiClient()) {
      const materialsContext = validMaterials
        .map((mat: { name: string; content: string }, idx: number) => {
          return `=== MATERIAL [${idx + 1}]: "${mat.name}" ===\n${mat.content || "(No text content)"}\n`;
        })
        .join("\n\n");

      const systemInstruction = `You are an expert Academic Tutor and Study Partner AI agent.
Your primary role is to answer student questions strictly grounded in their uploaded study materials.
Always provide exact citations (source name and exact quote), Markdown formatting, suggested follow-ups, and key points.`;

      const userPrompt = `STUDY MATERIALS:\n${materialsContext}\n\nSTUDENT QUESTION:\n${lastMessage.text}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          citations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceName: { type: Type.STRING },
                quote: { type: Type.STRING },
                sectionOrPage: { type: Type.STRING },
              },
              required: ["sourceName", "quote"],
            },
          },
          suggestedFollowUps: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["answer", "suggestedFollowUps", "keyPoints"],
      };

      const result = await executeGeminiWithFallback({
        contents: userPrompt,
        systemInstruction,
        responseSchema,
      });

      if (result.text) {
        const parsed = JSON.parse(result.text);
        return res.json(parsed);
      }
    }
  } catch (_geminiErr) {
    // Falls back to Grounded Engine
  }

  // Intelligent Grounded NLP Engine directly answers from uploaded materials
  const answerResult = generateGroundedResponse(lastMessage.text, validMaterials, mode);
  return res.json(answerResult);
});

// 2. Email & Session Summary Agent Endpoint
app.post("/api/study/summarize-and-email", async (req, res) => {
  const {
    chatHistory,
    materials,
    audience = "professor",
    tone = "academic",
    senderName = "Student",
    recipientName = "Professor",
    customInstructions = "",
  } = req.body || {};

  const validHistory = Array.isArray(chatHistory) && chatHistory.length > 0
    ? chatHistory
    : [{ role: "user", text: "Study session review" }];
  const validMaterials = Array.isArray(materials) ? materials : [];

  try {
    if (!authBlocked && getGeminiClient()) {
      const formattedHistory = validHistory
        .map((m: { role: string; text: string }) => `[${m.role.toUpperCase()}]: ${m.text}`)
        .join("\n\n");

      const materialsList = validMaterials
        .map((m: { name: string; summary?: string }) => `- ${m.name}`)
        .join("\n");

      const systemInstruction = `You are a specialized Executive Study & Communication Agent.
Analyze the study transcript and return a structured summary and email draft tailored for ${audience}.`;

      const prompt = `STUDENT: ${senderName}\nRECIPIENT: ${recipientName}\nMATERIALS:\n${materialsList}\nTRANSCRIPT:\n${formattedHistory}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          summaryOverview: { type: Type.STRING },
          keyTopicsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
          questionsResolved: { type: Type.ARRAY, items: { type: Type.STRING } },
          pendingQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          subject: { type: Type.STRING },
          recipient: { type: Type.STRING },
          body: { type: Type.STRING },
        },
        required: [
          "summaryOverview",
          "keyTopicsCovered",
          "questionsResolved",
          "pendingQuestions",
          "actionItems",
          "subject",
          "body",
        ],
      };

      const result = await executeGeminiWithFallback({
        contents: prompt,
        systemInstruction,
        responseSchema,
      });

      if (result.text) {
        return res.json(JSON.parse(result.text));
      }
    }
  } catch (_geminiErr) {
    // Falls back to Grounded Engine
  }

  const fallback = generateIntelligentEmailDigest({
    chatHistory: validHistory,
    materials: validMaterials,
    audience,
    tone,
    senderName,
    recipientName,
    customInstructions,
  });
  return res.json(fallback);
});

// 3. Email Refine Agent Endpoint
app.post("/api/study/refine-email", async (req, res) => {
  const { currentDraft, refinePrompt } = req.body || {};

  if (!currentDraft || !refinePrompt) {
    return res.status(400).json({ error: "Missing draft or instructions" });
  }

  try {
    if (!authBlocked && getGeminiClient()) {
      const prompt = `Modify this email draft based on: "${refinePrompt}"\n\nSUBJECT: ${currentDraft.subject}\nBODY:\n${currentDraft.body}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body: { type: Type.STRING },
        },
        required: ["subject", "body"],
      };

      const result = await executeGeminiWithFallback({
        contents: prompt,
        responseSchema,
      });

      if (result.text) {
        return res.json(JSON.parse(result.text));
      }
    }
  } catch {
    // Fall through
  }

  let refinedBody = currentDraft.body || "";
  if (refinePrompt.toLowerCase().includes("concise") || refinePrompt.toLowerCase().includes("short")) {
    refinedBody = (currentDraft.body || "")
      .split("\n\n")
      .filter((p: string) => !p.toLowerCase().includes("hope this email finds you"))
      .join("\n\n");
  } else if (refinePrompt.toLowerCase().includes("formal") || refinePrompt.toLowerCase().includes("polite")) {
    refinedBody = `Dear Professor,\n\nI hope this message finds you well.\n\n${refinedBody}\n\nRespectfully,\nStudent`;
  } else {
    refinedBody += `\n\nNote: ${refinePrompt}`;
  }
  return res.json({ subject: currentDraft.subject, body: refinedBody });
});

// 4. Study Tools Generator (Flashcards & Quiz)
app.post("/api/study/generate-tools", async (req, res) => {
  const { toolType, materials } = req.body || {};
  const validMaterials = Array.isArray(materials) ? materials : [];

  const materialsContext = validMaterials
    .map((mat: { name: string; content: string }) => `MATERIAL: "${mat.name}"\n${mat.content}`)
    .join("\n\n");

  try {
    if (!authBlocked && getGeminiClient() && materialsContext.trim()) {
      if (toolType === "quiz") {
        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  sourceMaterialName: { type: Type.STRING },
                },
                required: ["id", "question", "options", "correctIndex", "explanation", "sourceMaterialName"],
              },
            },
          },
          required: ["questions"],
        };

        const result = await executeGeminiWithFallback({
          contents: `Generate 4 high-yield multiple-choice questions based directly on the following uploaded study materials:\n\n${materialsContext}`,
          responseSchema,
        });

        if (result.text) {
          return res.json(JSON.parse(result.text));
        }
      } else {
        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  sourceMaterialName: { type: Type.STRING },
                },
                required: ["id", "front", "back", "topic", "sourceMaterialName"],
              },
            },
          },
          required: ["flashcards"],
        };

        const result = await executeGeminiWithFallback({
          contents: `Generate 6 essential study flashcards based directly on the following uploaded study materials:\n\n${materialsContext}`,
          responseSchema,
        });

        if (result.text) {
          return res.json(JSON.parse(result.text));
        }
      }
    }
  } catch (_geminiErr) {
    // Falls back to Grounded Engine
  }

  // Dynamic Generation from uploaded materials
  if (toolType === "quiz") {
    const questions = generateDynamicQuiz(validMaterials, 4);
    return res.json({ questions });
  } else {
    const flashcards = generateDynamicFlashcards(validMaterials, 6);
    return res.json({ flashcards });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        cors: true,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const candidates = [
      path.join(process.cwd(), "dist"),
      path.join(__dirname, "dist"),
      __dirname,
    ];
    const distPath = candidates.find(p => fs.existsSync(path.join(p, "index.html"))) || path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application index.html not found");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Study Assistant server running on port ${PORT}`);
  });
}

startServer();
