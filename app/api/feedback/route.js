let STORE = globalThis.__CHATTER_STORE__ || [];
globalThis.__CHATTER_STORE__ = STORE;

export async function POST(req) {
  const body = await req.json();
  const item = {
    id: crypto.randomUUID(),
    ...body,
    createdAt: Date.now(),
  };
  STORE.push(item);
  return Response.json({ ok: true, item });
}

export async function GET() {
  return Response.json({ ok: true, items: STORE });
}
