import { tools, localResult } from "../server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

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

  res.json({
    mode: "demo",
    credits: tools[tool]?.cost || 2,
    result: localResult(tool, input, language)
  });
}
