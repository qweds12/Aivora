export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      result: "الطريقة غير مسموحة"
    });
  }


  try {

    const body = req.body || {};
    const input = body.input;


    if (!input || !input.trim()) {

      return res.status(200).json({
        result: "اكتب طلبك أولاً"
      });

    }


    const result = 
`فكرة تطبيق ذكاء اصطناعي:

${input}

الاسم المقترح:
Aivora AI 🚀

الوصف:
منصة ذكاء اصطناعي تساعد المستخدمين على إنشاء الأفكار والمحتوى والتطبيقات.

المميزات:
- توليد أفكار جديدة
- كتابة محتوى
- إنشاء خطط مشاريع
- مساعدة في تطوير التطبيقات
`;


    return res.status(200).json({
      result: result
    });


  } catch(error) {

    return res.status(500).json({
      result: "حدث خطأ في الخادم"
    });

  }

}
