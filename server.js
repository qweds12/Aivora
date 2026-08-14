import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const tools = {
  video: { name: "Video Studio", cost: 20 },
  image: { name: "Image Prompt Studio", cost: 5 },
  social: { name: "Social Studio", cost: 3 },
  prompt: { name: "Prompt Builder", cost: 2 },
  cv: { name: "CV Builder", cost: 5 },
  idea: { name: "Business Ideas", cost: 3 }
};

function localResult(tool, input, lang) {
  const labels = {
    ar: ["تحليل الطلب", "النتيجة", "خطوات مقترحة"],
    en: ["Request analysis", "Result", "Suggested steps"]
  }[lang] || ["تحليل الطلب", "النتيجة", "خطوات مقترحة"];

  const name = tools[tool]?.name || "AI Studio";

  return {
    title: name,
    sections: [
      {
        title: labels[0],
        text: `تم تحليل طلبك: ${input}`
      },
      {
        title: labels[1],
        text: "هذه نتيجة تجريبية. لم يتم الاتصال بمحرك Gemini."
      },
      {
        title: labels[2],
        text: "تحقق من إعداد GEMINI_API_KEY ثم أعد المحاولة."
      }
    ]
  };
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Aivora AI",
    version: "2.0.0",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.get("/api/tools", (req, res) => {
  res.json(tools);
});

app.post("/api/generate", async (req, res) => {
  const {
    tool = "prompt",
    input = "",
    language = "ar"
  } = req.body || {};

  if (!input.trim()) {
    return res.status(400).json({
      error: "اكتب طلبك أولاً"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // إذا لم يوجد مفتاح Gemini، يبقى الموقع يعمل بوضع تجريبي
  if (!apiKey) {
    return res.json({
      mode: "demo",
      credits: tools[tool]?.cost || 2,
      result: localResult(tool, input, language)
    });
  }

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(model)}:generateContent`;

    const systemPrompt = `
You are Aivora AI, a professional Arabic-first AI assistant.

Selected tool:
${tools[tool]?.name || tool}

Requested language:
${language}

User request:
${input}

Instructions:
- Give a useful and practical answer.
- If the requested language is Arabic, answer in clear Arabic.
- Do not mention API keys.
- Do not mention internal server implementation.
- Be accurate and concise.
`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: systemPrompt
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: input
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error: "حدث خطأ من Gemini",
        detail: data?.error?.message || "Gemini API error"
      });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("\n")
      .trim();

    if (!text) {
      return res.status(502).json({
        error: "لم تُرجع Gemini نتيجة نصية"
      });
    }

    return res.json({
      mode: "live",
      provider: "Gemini",
      model,
      credits: tools[tool]?.cost || 2,
      result: {
        title: tools[tool]?.name || tool,
        sections: [
          {
            title: "Aivora AI",
            text
          }
        ]
      }
    });

  } catch (error) {
    console.error("Server Gemini error:", error);

    return res.status(502).json({
      error: "تعذر الاتصال بـ Gemini حالياً",
      detail: error.message
    });
  }
});

app.post("/api/checkout", (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({
      mode: "demo",
      message: "الدفع غير مفعل حالياً."
    });
  }

  return res.json({
    mode: "stripe-ready",
    message: "Stripe جاهز للربط بمرحلة الدفع."
  });
});

app.get(/.*/, (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

export default app;
