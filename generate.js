export default async function handler(req, res) {

if(req.method !== "POST"){
return res.status(405).json({
error:"Method not allowed"
});
}


const {input} = req.body || {};


if(!input || !input.trim()){

return res.status(400).json({
error:"اكتب طلبك أولاً"
});

}



const result = {

title:"فكرة تطبيق ذكاء اصطناعي",

sections:[

{
title:"تحليل الطلب",
text:`${input}`
},

{
title:"الفكرة",
text:"تطبيق ذكاء اصطناعي يساعد المستخدم على إنشاء الأفكار والمحتوى بسرعة."
},

{
title:"المميزات",
text:"إنشاء أفكار، كتابة محتوى، تحسين البرومبتات، واقتراح حلول ذكية."
}

]

};


return res.status(200).json({
result:result
});


}
