import { getStore } from "@netlify/blobs";
import { body, json, makeOrderId } from "./_shared/payment.mjs";

function catalogFromEnv() {
  try { return JSON.parse(process.env.NEXFIVE_PRODUCT_CATALOG_JSON || "{}"); } catch { return {}; }
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  const input = await body(req);
  if (!input) return json({ error: "Invalid JSON." }, 400);
  const productId=String(input.productId||"");
  const productName=String(input.productName||"").trim();
  const amount=Number(input.amount);
  const buyerName=String(input.buyerName||"").trim();
  const discordName=String(input.discordName||"").trim();
  const accountEmail=String(input.accountEmail||"").trim();
  if(!productId||!productName||!Number.isSafeInteger(amount)||amount<=0||!buyerName||!discordName) return json({error:"필수 주문 정보가 없습니다."},400);

  // If a server-side catalog is configured, never trust the browser price/name.
  const catalog=catalogFromEnv();
  if(Object.keys(catalog).length){
    const serverProduct=catalog[productId];
    if(!serverProduct) return json({error:"판매 중인 상품이 아닙니다."},400);
    if(Number(serverProduct.price)!==amount || String(serverProduct.name)!==productName) return json({error:"상품 가격 또는 정보가 변경되었습니다. 새로고침 후 다시 시도해 주세요."},409);
  }

  const orderId=makeOrderId();
  const order={orderId,productId,productName,amount,buyerName,discordName,accountEmail,accountProvider:String(input.accountProvider||"guest"),status:"READY",createdAt:new Date().toISOString()};
  const store=getStore("nexfive-orders");
  await store.setJSON(orderId,order);
  return json({orderId,amount,orderName:productName});
};
