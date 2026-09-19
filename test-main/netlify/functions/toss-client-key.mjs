export default async () => {
  const clientKey = process.env.TOSS_CLIENT_KEY;
  if (!clientKey) return Response.json({ error: "TOSS_CLIENT_KEY is not configured." }, { status: 500 });
  return Response.json({ clientKey }, { headers: { "Cache-Control": "no-store" } });
};
