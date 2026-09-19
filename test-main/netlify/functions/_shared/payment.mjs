import crypto from "node:crypto";

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function body(req) {
  try { return await req.json(); } catch { return null; }
}

export function requireSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function makeOrderId() {
  return `NX-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`;
}

export function tossAuthHeader() {
  const secret = requireSecret("TOSS_SECRET_KEY");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export async function tossConfirm({ paymentKey, orderId, amount }) {
  const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: tossAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export function validWebhookUrl(url) {
  return /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(url || "");
}

export async function sendDiscordWebhook(order, payment) {
  if (String(process.env.DISCORD_WEBHOOK_ENABLED || "false").toLowerCase() !== "true") return false;
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!validWebhookUrl(url)) throw new Error("DISCORD_WEBHOOK_URL is missing or invalid.");
  const payload = {
    username: "NexFive Hub",
    embeds: [{
      title: "✅ 결제 승인 완료",
      fields: [
        { name: "구매자", value: String(order.buyerName || "-"), inline: true },
        { name: "Discord", value: String(order.discordName || "-"), inline: true },
        { name: "상품", value: String(order.productName || payment.orderName || "-"), inline: true },
        { name: "금액", value: `${Number(payment.totalAmount || order.amount).toLocaleString("ko-KR")}원`, inline: true },
        { name: "주문번호", value: String(order.orderId), inline: false },
        { name: "결제수단", value: String(payment.method || "-"), inline: true },
        { name: "결제키", value: String(payment.paymentKey || "-"), inline: false },
      ],
      timestamp: new Date().toISOString(),
    }],
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Discord Webhook HTTP ${response.status}`);
  return true;
}
