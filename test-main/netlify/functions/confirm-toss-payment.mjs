import { getStore } from "@netlify/blobs";
import { body, json, sendDiscordWebhook, tossConfirm } from "./_shared/payment.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  const input=await body(req);
  const paymentKey=String(input?.paymentKey||"");
  const orderId=String(input?.orderId||"");
  const amount=Number(input?.amount);
  if(!paymentKey||!orderId||!Number.isSafeInteger(amount)||amount<=0) return json({error:"결제 승인 정보가 올바르지 않습니다."},400);

  const store=getStore("nexfive-orders");
  const order=await store.get(orderId,{type:"json",consistency:"strong"});
  if(!order) return json({error:"주문을 찾을 수 없습니다."},404);
  if(order.status === "PAID") return json({payment:order.payment,order,webhookSent:!!order.webhookSent});
  if(Number(order.amount)!==amount) return json({error:"결제 금액이 주문 금액과 일치하지 않습니다."},400);

  const {response,data}=await tossConfirm({paymentKey,orderId,amount});
  if(!response.ok) return json({error:data?.message||data?.code||"Toss Payments 승인 실패",code:data?.code||null},response.status);
  if(Number(data.totalAmount)!==Number(order.amount)) return json({error:"Toss 승인 금액과 주문 금액이 일치하지 않습니다."},409);

  order.status="PAID";
  order.payment={paymentKey:data.paymentKey,orderId:data.orderId,totalAmount:data.totalAmount,method:data.method,status:data.status,approvedAt:data.approvedAt,orderName:data.orderName};
  let webhookSent=false;
  try { webhookSent=await sendDiscordWebhook(order,data); } catch(error) { console.error("Discord webhook failed:",error); }
  order.webhookSent=webhookSent;
  order.paidAt=new Date().toISOString();
  await store.setJSON(orderId,order);
  return json({payment:data,order,webhookSent});
};
