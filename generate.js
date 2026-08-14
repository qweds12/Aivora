export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }


  const { input } = req.body || {};


  if (!input || !input.trim()) {
    return res.status(400).json({
      error: "اكتب طلبك أولاً"
    });
  }


  // رد تجريبي حاليا
  // لاحقا نربطه بالذكاء الاصطناعي الحقيقي

  const result = `
فكرة تطبيق ذكاء اصطناعي:

${input}

الاسم المقترح:
Aivora AI

الوصف:
تطبيق يساعد المستخدمين على إنشاء الأفكار والمحتوى باستخدام الذكاء الاصطناعي.
`;


  return res.status(200).json({
    result: result
  });

}
