import { json, sendDiscordWebhook } from "./_shared/payment.mjs";
export default async (req) => {
  if(req.method!=="POST") return json({error:"Method Not Allowed"},405);
  const order={orderId:`TEST-${Date.now()}`,productName:"NexFive Hub Webhook 테스트",amount:0,buyerName:"테스트 구매자",discordName:"test_user"};
  try { await sendDiscordWebhook(order,{paymentKey:"TEST",totalAmount:0,method:"TEST",orderName:order.productName}); return json({ok:true}); }
  catch(error){ return json({error:error.message||String(error)},500); }
};
