import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for file/image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy/Safe Gemini Initialization
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// 1. Study Chat Agent Endpoint (Grounded QA with Citations & Follow-ups)
app.post("/api/study/chat", async (req, res) => {
  try {
    const { messages, materials, mode = "qa" } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid messages array" });
    }

    const ai = getGeminiClient();

    // Prepare active study context
    const materialsContext = (materials || [])
      .map((mat: { name: string; content: string }, idx: number) => {
        return `=== MATERIAL [${idx + 1}]: "${mat.name}" ===\n${mat.content || "(No text content)"}\n`;
      })
      .join("\n\n");

    const systemInstruction = `You are an expert Academic Tutor and Study Partner AI agent.
Your primary role is to answer the student's questions based on their uploaded study materials.

GROUNDING & CITATION DIRECTIVES:
1. GROUNDING: Prioritize facts, definitions, formulas, and explanations found in the provided study materials.
2. CITATIONS: Whenever you reference or draw from a material, provide exact quotes or precise section references in the citations list and mention the source document name.
3. BEYOND MATERIAL: If the user asks something not present in their materials, explicitly mention: "Note: This is supplementary context not directly in your uploaded notes:" and then provide the accurate academic explanation.
4. PEDAGOGY: Format your response clearly using Markdown (headers, bullet points, bold concepts, LaTeX/code blocks where applicable). Be encouraging, rigorous, and clear.
5. SUGGESTIONS: Provide 2 to 3 insightful, high-value follow-up questions the student could explore next to deepen their understanding.
6. KEY POINTS: Provide 2 to 4 concise bullet takeaways summarizing the answer.

Current Study Mode: ${mode}`;

    const lastMessage = messages[messages.length - 1];
    const conversationHistory = messages
      .slice(0, -1)
      .map((m: { role: string; text: string }) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`)
      .join("\n");

    const userPrompt = `HERE ARE THE STUDENT'S UPLOADED STUDY MATERIALS:
---------------------------------------------
${materialsContext || "No specific study materials uploaded. Provide general academic assistance."}
---------------------------------------------

CONVERSATION HISTORY:
${conversationHistory || "No previous history."}

STUDENT'S LATEST QUESTION:
${lastMessage.text}

Respond in the specified JSON structure with answer, citations, suggestedFollowUps, and keyPoints.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: "The complete, detailed tutor response formatted in Markdown.",
            },
            citations: {
              type: Type.ARRAY,
              description: "Direct quotes or references from the uploaded materials.",
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceName: { type: Type.STRING, description: "Name of the source material" },
                  quote: { type: Type.STRING, description: "Exact excerpt or key sentence" },
                  sectionOrPage: { type: Type.STRING, description: "Section heading or topic" },
                },
                required: ["sourceName", "quote"],
              },
            },
            suggestedFollowUps: {
              type: Type.ARRAY,
              description: "2-3 short, relevant follow-up questions.",
              items: { type: Type.STRING },
            },
            keyPoints: {
              type: Type.ARRAY,
              description: "2-4 bullet point takeaways.",
              items: { type: Type.STRING },
            },
          },
          required: ["answer", "suggestedFollowUps", "keyPoints"],
        },
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: unknown) {
    console.error("Error in /api/study/chat:", err);
    const message = err instanceof Error ? err.message : "Failed to generate chat response";
    return res.status(500).json({ error: message });
  }
});

// 2. Email & Session Summary Agent Endpoint
app.post("/api/study/summarize-and-email", async (req, res) => {
  try {
    const {
      chatHistory,
      materials,
      audience = "professor",
      tone = "academic",
      senderName = "Student",
      recipientName = "Professor",
      customInstructions = "",
    } = req.body;

    if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
      return res.status(400).json({ error: "Chat history is empty or invalid" });
    }

    const ai = getGeminiClient();

    const formattedHistory = chatHistory
      .map((m: { role: string; text: string }) => `[${m.role.toUpperCase()}]: ${m.text}`)
      .join("\n\n");

    const materialsList = (materials || [])
      .map((m: { name: string; summary?: string }) => `- ${m.name}${m.summary ? ` (${m.summary})` : ""}`)
      .join("\n");

    const systemInstruction = `You are a specialized Executive Study & Communication Agent.
Your job is to analyze a student's study Q&A session transcript and:
1. Generate an analytical, high-level summary of what was learned, concepts explored, and questions raised.
2. Compose a complete, professional, ready-to-send email draft tailored specifically for the chosen recipient audience (${audience}) and tone (${tone}).

AUDIENCE GUIDELINES:
- 'professor': Formal and academic. Clearly introduces student, states course/materials studied, summarizes concepts mastered, and highlights 1-2 articulate clarification questions or discussion points for office hours/email.
- 'study_group': Collaborative and structured. Shares a neat summary of notes, key formulas/rules, resolved tricky concepts, and open questions to discuss at the next group session.
- 'personal': Digest style. Self-reflective study log, key formulas/points to review before exam, list of weak spots to revisit.
- 'custom': Follow student's custom instructions precisely.

TONE GUIDELINES:
- 'academic' / 'formal': Professional salutations, clear paragraph structure, polite closing.
- 'collaborative': Friendly, energetic, organized with bullet points and action items.
- 'concise': Bullet points only, minimal fluff, high density of information.`;

    const prompt = `STUDENT NAME: ${senderName || "Student"}
RECIPIENT: ${recipientName || "Professor / Study Group"}
AUDIENCE TYPE: ${audience}
TONE: ${tone}
${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ""}

ACTIVE STUDY MATERIALS IN SESSION:
${materialsList || "Study notes"}

STUDY CHAT TRANSCRIPT:
---------------------------------------------
${formattedHistory}
---------------------------------------------

Analyze this session and return the JSON schema with summary overview, topics covered, resolved insights, pending questions, action items, and the full email draft.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryOverview: {
              type: Type.STRING,
              description: "A concise 2-3 sentence overview of the study session.",
            },
            keyTopicsCovered: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of key academic topics covered.",
            },
            questionsResolved: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key concepts and questions successfully understood in the session.",
            },
            pendingQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Unresolved doubts or questions to ask the professor or discuss.",
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Next study steps, revision tasks, or practice problems.",
            },
            subject: {
              type: Type.STRING,
              description: "Clear, professional email subject line.",
            },
            recipient: {
              type: Type.STRING,
              description: "Suggested recipient placeholder or email address.",
            },
            cc: {
              type: Type.STRING,
              description: "Optional CC placeholder.",
            },
            body: {
              type: Type.STRING,
              description: "The complete, polished email body with greeting, structured content, questions, and sign-off.",
            },
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
        },
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: unknown) {
    console.error("Error in /api/study/summarize-and-email:", err);
    const message = err instanceof Error ? err.message : "Failed to generate email summary";
    return res.status(500).json({ error: message });
  }
});

// 3. Email Refine Agent Endpoint (iterate on email draft with prompt)
app.post("/api/study/refine-email", async (req, res) => {
  try {
    const { currentDraft, refinePrompt } = req.body;

    if (!currentDraft || !refinePrompt) {
      return res.status(400).json({ error: "Missing current draft or refine instructions" });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert Email Editor Agent.
Modify the following email draft according to the user's specific request: "${refinePrompt}".

CURRENT SUBJECT: ${currentDraft.subject}
CURRENT BODY:
${currentDraft.body}

CURRENT AUDIENCE: ${currentDraft.audience}
CURRENT TONE: ${currentDraft.tone}

Apply the requested changes while maintaining proper email formatting, politeness, and clarity.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
            summaryChange: { type: Type.STRING, description: "Brief 1-sentence note of what was revised" },
          },
          required: ["subject", "body"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: unknown) {
    console.error("Error in /api/study/refine-email:", err);
    const message = err instanceof Error ? err.message : "Failed to refine email";
    return res.status(500).json({ error: message });
  }
});

// 4. Study Tools Generator (Flashcards & Quiz from uploaded materials)
app.post("/api/study/generate-tools", async (req, res) => {
  try {
    const { toolType, materials } = req.body; // 'quiz' | 'flashcards'
    const ai = getGeminiClient();

    const materialsContext = (materials || [])
      .map((mat: { name: string; content: string }) => `MATERIAL: "${mat.name}"\n${mat.content}`)
      .join("\n\n");

    if (!materialsContext.trim()) {
      return res.status(400).json({ error: "Please upload or enable study materials first." });
    }

    if (toolType === "quiz") {
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `Generate 4 high-yield multiple-choice questions grounded directly in these study materials:\n\n${materialsContext}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "4 distinct options",
                    },
                    correctIndex: { type: Type.INTEGER, description: "0-indexed index of correct option" },
                    explanation: { type: Type.STRING, description: "Why this is correct grounded in material" },
                    sourceMaterialName: { type: Type.STRING },
                  },
                  required: ["id", "question", "options", "correctIndex", "explanation", "sourceMaterialName"],
                },
              },
            },
            required: ["questions"],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{"questions":[]}');
      return res.json(parsed);
    } else {
      // Flashcards
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `Generate 6 essential study flashcards (Front: Concept/Question, Back: Explanation/Definition/Mechanism) based on:\n\n${materialsContext}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    front: { type: Type.STRING, description: "Core concept, term, or prompt" },
                    back: { type: Type.STRING, description: "Clear definition, formula, or breakdown" },
                    topic: { type: Type.STRING },
                    sourceMaterialName: { type: Type.STRING },
                  },
                  required: ["id", "front", "back", "topic", "sourceMaterialName"],
                },
              },
            },
            required: ["flashcards"],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{"flashcards":[]}');
      return res.json(parsed);
    }
  } catch (err: unknown) {
    console.error("Error in /api/study/generate-tools:", err);
    const message = err instanceof Error ? err.message : "Failed to generate study tool items";
    return res.status(500).json({ error: message });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Study Assistant server listening on port ${PORT}`);
  });
}

startServer();
