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


function localResult(tool, input) {

  return {
    title: tools[tool]?.name || "Aivora AI",

    sections: [
      {
        title: "تحليل الطلب",
        text: `تم تحليل طلبك: ${input}`
      },

      {
        title: "النتيجة",
        text:
        "هذه نسخة تجريبية. عند تشغيل Gemini API سيتم إنشاء نتيجة ذكاء اصطناعي حقيقية."
      },

      {
        title: "خطوات مقترحة",
        text:
        "حدد الهدف والجمهور والأسلوب ثم قم بمراجعة النتيجة."
      }
    ]
  };
}



app.get("/api/health", (req,res)=>{

res.json({
 ok:true,
 service:"Aivora AI",
 version:"2.0 Gemini"
});

});



app.get("/api/tools",(req,res)=>{

res.json(tools);

});





app.post("/api/generate", async (req,res)=>{


const {
 tool="prompt",
 input="",
 language="ar"
}=req.body || {};



if(!input.trim()){

return res.status(400).json({

error:"اكتب طلبك أولاً"

});

}



const cost = tools[tool]?.cost || 2;



// وضع التجربة

if(!process.env.GEMINI_API_KEY){

return res.json({

mode:"demo",

credits:cost,

result:localResult(tool,input)

});

}



try{


const prompt = `

أنت Aivora AI مساعد ذكاء اصطناعي احترافي.

الأداة:
${tools[tool]?.name}

اللغة:
${language}

طلب المستخدم:
${input}

أعطني نتيجة منظمة وعملية.

`;



const response = await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,

{

method:"POST",

headers:{
"Content-Type":"application/json"
},


body:JSON.stringify({

contents:[

{

parts:[

{

text:prompt

}

]

}

]

})

}

);



if(!response.ok){

throw new Error(
`Gemini Error ${response.status}`
);

}



const data = await response.json();



const text =
data.candidates?.[0]
?.content
?.parts?.[0]
?.text
||
"لم يتم إنشاء نتيجة";




res.json({

mode:"gemini",

credits:cost,

result:{

title:tools[tool]?.name,

sections:[

{

title:"Gemini AI",

text:text

}

]

}

});



}

catch(error){


res.status(500).json({

error:"خطأ في الاتصال بـ Gemini",

detail:error.message

});


}



});






app.post("/api/checkout",(req,res)=>{


res.json({

mode:"demo",

message:
"الدفع سيتم تفعيله لاحقاً"

});


});






app.get("*",(req,res)=>{


res.sendFile(

path.join(
__dirname,
"public",
"index.html"
)

);


});




export default app;
