import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());

app.use(express.json({
  limit: "2mb"
}));

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// ===============================
// AIVORA AI TOOLS
// ===============================

const tools = {

  video: {
    name: "Video Studio",
    cost: 20
  },

  image: {
    name: "Image Prompt Studio",
    cost: 5
  },

  social: {
    name: "Social Studio",
    cost: 3
  },

  prompt: {
    name: "Prompt Builder",
    cost: 2
  },

  cv: {
    name: "CV Builder",
    cost: 5
  },

  idea: {
    name: "Business Ideas",
    cost: 3
  }

};


// ===============================
// DEMO RESULT
// ===============================

function localResult(tool, input) {

  return {

    title:
      tools[tool]?.name ||
      "Aivora AI",

    sections: [

      {
        title: "تحليل الطلب",

        text:
          `تم تحليل طلبك: ${input}`
      },

      {

        title: "النتيجة",

        text:
          "هذه نتيجة تجريبية. عند تشغيل Gemini سيتم إنشاء إجابة ذكاء اصطناعي حقيقية."
      },

      {

        title: "خطوات مقترحة",

        text:
          "حدد الجمهور والهدف والأسلوب، ثم راجع النتيجة قبل النشر."
      }

    ]

  };

}


// ===============================
// HEALTH
// ===============================

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      ok: true,

      service:
        "Aivora AI",

      version:
        "3.0 Gemini",

      gemini:
        Boolean(
          process.env.GEMINI_API_KEY
        )

    });

  }
);


// ===============================
// TOOLS
// ===============================

app.get(
  "/api/tools",
  (req, res) => {

    res.json(tools);

  }
);


// ===============================
// GEMINI GENERATOR
// ===============================

app.post(
  "/api/generate",
  async (req, res) => {

    const {

      tool = "prompt",

      input = "",

      language = "ar"

    } = req.body || {};


    // ---------------------------
    // Validate input
    // ---------------------------

    if (
      typeof input !== "string" ||
      !input.trim()
    ) {

      return res.status(400).json({

        error:
          "اكتب طلبك أولاً"

      });

    }


    // ---------------------------
    // Tool cost
    // ---------------------------

    const cost =
      tools[tool]?.cost || 2;


    // ---------------------------
    // Demo mode
    // ---------------------------

    if (
      !process.env.GEMINI_API_KEY
    ) {

      return res.json({

        mode: "demo",

        credits: cost,

        result:
          localResult(
            tool,
            input
          )

      });

    }


    try {

      // -------------------------
      // Gemini model
      // -------------------------

      const model =
        process.env.GEMINI_MODEL ||
        "gemini-3.5-flash";


      // -------------------------
      // Prompt
      // -------------------------

      const prompt = `

أنت Aivora AI، مساعد ذكاء اصطناعي احترافي.

اسم الأداة:
${tools[tool]?.name || tool}

لغة الإجابة:
${language}

طلب المستخدم:
${input}

المطلوب:

1. افهم طلب المستخدم بدقة.
2. قدم نتيجة عملية ومفيدة.
3. لا تقل إنك نسخة تجريبية.
4. لا تذكر مفاتيح API.
5. لا تشرح طريقة عمل الخادم.
6. اجعل الإجابة منظمة وسهلة القراءة.
7. استخدم اللغة التي طلبها المستخدم.

`;


      // -------------------------
      // Gemini API
      // -------------------------

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;


      const response =
        await fetch(
          url,
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "x-goog-api-key":
                process.env.GEMINI_API_KEY

            },

            body:
              JSON.stringify({

                contents: [

                  {

                    role: "user",

                    parts: [

                      {
                        text: prompt
                      }

                    ]

                  }

                ],

                generationConfig: {

                  temperature: 0.7,

                  maxOutputTokens:
                    2048

                }

              })

          }
        );


      // -------------------------
      // Gemini error
      // -------------------------

      if (!response.ok) {

        const errorText =
          await response.text();

        throw new Error(
          `Gemini API ${response.status}: ${errorText}`
        );

      }


      // -------------------------
      // Response JSON
      // -------------------------

      const data =
        await response.json();


      // -------------------------
      // Extract text
      // -------------------------

      const text =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.map(
            part => part.text || ""
          )
          .join("")
          .trim();


      if (!text) {

        throw new Error(
          "Gemini returned an empty response"
        );

      }


      // -------------------------
      // Final response
      // -------------------------

      return res.json({

        mode: "gemini",

        model,

        credits: cost,

        result: {

          title:
            tools[tool]?.name ||
            "Aivora AI",

          sections: [

            {

              title:
                "Aivora AI",

              text

            }

          ]

        }

      });


    } catch (error) {

      console.error(
        "Gemini error:",
        error
      );


      return res.status(502).json({

        error:
          "تعذر الاتصال بمحرك Gemini حالياً",

        detail:
          error.message

      });

    }

  }
);


// ===============================
// CHECKOUT
// ===============================

app.post(
  "/api/checkout",
  (req, res) => {

    if (
      !process.env.STRIPE_SECRET_KEY
    ) {

      return res.json({

        mode: "demo",

        message:
          "الدفع غير مفعل حالياً."

      });

    }


    return res.json({

      mode:
        "stripe-ready",

      message:
        "Stripe جاهز للربط. سيتم إنشاء Checkout Session في المرحلة القادمة."

    });

  }
);


// ===============================
// FRONTEND FALLBACK
// ===============================
//
// هذا الأسلوب متوافق مع Express 5
// ولا يستخدم app.get("*")
// ===============================

app.use(
  (req, res, next) => {

    if (
      req.method !== "GET"
    ) {

      return next();

    }


    // لا نعيد index.html
    // لمسارات API غير الموجودة

    if (
      req.path.startsWith(
        "/api/"
      )
    ) {

      return res.status(404).json({

        error:
          "API endpoint not found"

      });

    }


    return res.sendFile(

      path.join(
        __dirname,
        "public",
        "index.html"
      )

    );

  }
);


// ===============================
// ERROR HANDLER
// ===============================

app.use(
  (err, req, res, next) => {

    console.error(err);

    res.status(500).json({

      error:
        "حدث خطأ داخلي في الخادم"

    });

  }
);


export default app;
