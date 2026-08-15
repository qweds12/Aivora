import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const publicDir = path.join(
  __dirname,
  "public"
);

// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors());

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.static(publicDir)
);


// =========================================================
// TOOLS
// =========================================================

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


// =========================================================
// SUPABASE CONFIGURATION
// =========================================================

const supabaseConfigured = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_KEY
);

const supabase = supabaseConfigured
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;


// =========================================================
// USER SUPABASE CLIENT
// =========================================================

function userClient(token) {

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },

      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
}


// =========================================================
// AUTH CONTEXT
// =========================================================

async function authContext(req) {

  if (!supabaseConfigured) {
    return null;
  }

  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token =
    header.slice(7).trim();

  if (!token) {
    return null;
  }

  try {

    const {
      data,
      error
    } = await supabase.auth.getUser(token);

    if (
      error ||
      !data?.user
    ) {
      return null;
    }

    return {
      user: data.user,
      client: userClient(token)
    };

  } catch (error) {

    console.error(
      "Auth error:",
      error.message
    );

    return null;
  }
}


// =========================================================
// REQUIRE AUTH
// =========================================================

async function requireAuth(
  req,
  res
) {

  const ctx =
    await authContext(req);

  if (!ctx) {

    res.status(401).json({
      error:
        "يجب تسجيل الدخول أولاً"
    });

    return null;
  }

  return ctx;
}


// =========================================================
// DEMO RESULT
// =========================================================

function demoResult(
  tool,
  input
) {

  return {

    title:
      tools[tool]?.name ||
      "Aivora AI",

    sections: [

      {
        title:
          "تحليل الطلب",

        text:
          `تم تحليل طلبك: ${input}`
      },

      {
        title:
          "النتيجة",

        text:
          "هذه نتيجة تجريبية. أضف GEMINI_API_KEY لتفعيل إجابة Gemini الحقيقية."
      },

      {
        title:
          "خطوات مقترحة",

        text:
          "حدد الجمهور والهدف والأسلوب، ثم راجع النتيجة قبل النشر."
      }

    ]

  };
}


// =========================================================
// API CONFIG
// =========================================================

app.get(
  "/api/config",
  (req, res) => {

    res.json({

      supabaseUrl:
        process.env.SUPABASE_URL || "",

      supabaseKey:
        process.env.SUPABASE_KEY || "",

      authEnabled:
        supabaseConfigured

    });

  }
);


// =========================================================
// HEALTH CHECK
// =========================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      ok: true,

      service:
        "Aivora AI",

      version:
        "2.1",

      gemini:
        Boolean(
          process.env.GEMINI_API_KEY
        ),

      supabase:
        supabaseConfigured

    });

  }
);


// =========================================================
// TOOLS API
// =========================================================

app.get(
  "/api/tools",
  (req, res) => {

    res.json(tools);

  }
);


// =========================================================
// CURRENT USER
// =========================================================

app.get(
  "/api/me",
  async (req, res) => {

    const ctx =
      await authContext(req);

    if (!ctx) {

      return res.json({
        authenticated: false
      });

    }

    try {

      const {
        data: profile,
        error
      } = await ctx.client

        .from("profiles")

        .select(
          "id,email,display_name,credits"
        )

        .eq(
          "id",
          ctx.user.id
        )

        .maybeSingle();


      if (error) {

        return res.status(500).json({

          error:
            "تعذر قراءة الحساب",

          detail:
            error.message

        });

      }


      res.json({

        authenticated: true,

        user: {

          id:
            ctx.user.id,

          email:
            ctx.user.email,

          displayName:
            profile?.display_name ||
            ctx.user.user_metadata?.display_name ||
            ""

        },

        credits:
          Number(
            profile?.credits ?? 0
          )

      });

    } catch (error) {

      console.error(
        "Profile error:",
        error.message
      );

      res.status(500).json({

        error:
          "تعذر قراءة الحساب",

        detail:
          error.message

      });

    }

  }
);


// =========================================================
// PROJECTS - GET
// =========================================================

app.get(
  "/api/projects",
  async (req, res) => {

    const ctx =
      await requireAuth(
        req,
        res
      );

    if (!ctx) {
      return;
    }

    const {
      data,
      error
    } = await ctx.client

      .from("projects")

      .select(
        "id,tool,input,result,credits_used,created_at"
      )

      .order(
        "created_at",
        {
          ascending: false
        }
      )

      .limit(50);


    if (error) {

      return res.status(500).json({

        error:
          "تعذر تحميل المشاريع",

        detail:
          error.message

      });

    }


    res.json({
      projects:
        data || []
    });

  }
);


// =========================================================
// PROJECTS - DELETE
// =========================================================

app.delete(
  "/api/projects/:id",
  async (req, res) => {

    const ctx =
      await requireAuth(
        req,
        res
      );

    if (!ctx) {
      return;
    }

    const {
      error
    } = await ctx.client

      .from("projects")

      .delete()

      .eq(
        "id",
        req.params.id
      );


    if (error) {

      return res.status(500).json({

        error:
          "تعذر حذف المشروع",

        detail:
          error.message

      });

    }


    res.json({
      ok: true
    });

  }
);


// =========================================================
// CONSUME CREDITS
// =========================================================

async function consumeCredits(
  client,
  cost
) {

  const {
    data,
    error
  } = await client.rpc(
    "consume_credits",
    {
      p_cost: cost
    }
  );


  if (error) {
    throw error;
  }


  const row =
    Array.isArray(data)
      ? data[0]
      : data;


  if (!row) {

    throw new Error(
      "تعذر خصم Credits"
    );

  }


  return Number(
    row.remaining_credits ?? 0
  );

}


// =========================================================
// REFUND CREDITS
// =========================================================

async function refundCredits(
  ctx,
  cost
) {

  if (!ctx?.user?.id) {
    return;
  }

  try {

    /*
      SQL Stage 2:
      refund_credits(
        p_user_id,
        p_cost
      )
    */

    await ctx.client.rpc(
      "refund_credits",
      {
        p_user_id:
          ctx.user.id,

        p_cost:
          cost
      }
    );

  } catch (error) {

    console.error(
      "Credit refund error:",
      error.message
    );

  }

}


// =========================================================
// GENERATE
// =========================================================

app.post(
  "/api/generate",
  async (req, res) => {

    const {

      tool = "prompt",

      input = "",

      language = "ar"

    } = req.body || {};


    // -------------------------------------------------------
    // Validate input
    // -------------------------------------------------------

    if (
      typeof input !== "string" ||
      !input.trim()
    ) {

      return res.status(400).json({

        error:
          "اكتب طلبك أولاً"

      });

    }


    // -------------------------------------------------------
    // Validate tool
    // -------------------------------------------------------

    if (!tools[tool]) {

      return res.status(400).json({

        error:
          "الأداة المطلوبة غير موجودة"

      });

    }


    const cost =
      tools[tool].cost;


    // -------------------------------------------------------
    // Authentication
    // -------------------------------------------------------

    const ctx =
      await authContext(req);

    let remainingCredits =
      null;


    // -------------------------------------------------------
    // Consume credits
    // -------------------------------------------------------

    if (ctx) {

      try {

        remainingCredits =
          await consumeCredits(
            ctx.client,
            cost
          );

      } catch (error) {

        console.error(
          "Consume credits error:",
          error.message
        );

        return res.status(402).json({

          error:
            "رصيد Credits غير كافٍ",

          detail:
            error.message

        });

      }

    }


    // -------------------------------------------------------
    // Demo mode
    // -------------------------------------------------------

    if (
      !process.env.GEMINI_API_KEY
    ) {

      /*
        في وضع Demo لا نعتبر العملية
        فاشلة، لذلك لا نرجع Credits.
      */

      return res.json({

        mode:
          "demo",

        credits:
          cost,

        remainingCredits,

        result:
          demoResult(
            tool,
            input
          )

      });

    }


    // -------------------------------------------------------
    // Gemini
    // -------------------------------------------------------

    try {

const model = "gemini-2.0-flash";
      const prompt = `
أنت Aivora AI، مساعد ذكاء اصطناعي احترافي.

الأداة:
${tools[tool].name}

لغة الإجابة:
${language}

طلب المستخدم:
${input}

أعطِ نتيجة عملية ومفيدة.

استخدم اللغة المطلوبة.

نظّم الإجابة بعناوين ونقاط عند الحاجة.

لا تضف معلومات غير مطلوبة.

اجعل الإجابة واضحة ومباشرة.
`;


      const response =
        await fetch(

         `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` 

          {

            method:
              "POST",

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

                    role:
                      "user",

                    parts: [

                      {
                        text:
                          prompt
                      }

                    ]

                  }

                ],

                generationConfig: {

                  temperature:
                    0.7,

                  maxOutputTokens:
                    2048

                }

              })

          }

        );


      // -----------------------------------------------------
      // Gemini error
      // -----------------------------------------------------

      if (!response.ok) {

        const errorText =
          await response.text();

        throw new Error(
          `Gemini ${response.status}: ${errorText}`
        );

      }


      // -----------------------------------------------------
      // Gemini response
      // -----------------------------------------------------

      const data =
        await response.json();


      const text =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.map(
            (part) =>
              part.text || ""
          )
          .join("")
          .trim() || "";


      if (!text) {

        throw new Error(
          "Gemini returned an empty response"
        );

      }


      // -----------------------------------------------------
      // Result
      // -----------------------------------------------------

      const result = {

        title:
          tools[tool].name,

        sections: [

          {

            title:
              "Aivora AI",

            text

          }

        ]

      };


      // -----------------------------------------------------
      // Save project
      // -----------------------------------------------------

      if (ctx) {

        const {
          error
        } = await ctx.client

          .from("projects")

          .insert({

            user_id:
              ctx.user.id,

            tool,

            input,

            result,

            credits_used:
              cost

          });


        if (error) {

          console.error(
            "Project save error:",
            error.message
          );

        }

      }


      // -----------------------------------------------------
      // Success
      // -----------------------------------------------------

      return res.json({

        mode:
          "gemini",

        model,

        credits:
          cost,

        remainingCredits,

        result

      });


    } catch (error) {

      // -----------------------------------------------------
      // Refund on failure
      // -----------------------------------------------------

      if (ctx) {

        await refundCredits(
          ctx,
          cost
        );

      }


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


// =========================================================
// AUTH.JS DEBUG ROUTE
// =========================================================

app.get(
  "/api/auth.js",
  (req, res) => {

    res.sendFile(
      path.join(
        publicDir,
        "auth.js"
      )
    );

  }
);


// =========================================================
// CHECKOUT PLACEHOLDER
// =========================================================

app.get(
  "/api/checkout",
  (req, res) => {

    res.json({

      mode:
        "coming-soon",

      message:
        "نظام الدفع سيتم ربطه في المرحلة التالية."

    });

  }
);


// =========================================================
// FRONTEND FALLBACK
// =========================================================

app.get(
  /.*/,
  (req, res) => {

    res.sendFile(
      path.join(
        publicDir,
        "index.html"
      )
    );

  }
);


// =========================================================
// EXPORT
// =========================================================

export default app;
