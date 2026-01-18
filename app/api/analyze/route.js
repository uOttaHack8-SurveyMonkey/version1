import OpenAI from "openai";

export async function POST(req) {
  try {
    const { transcript } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 400,
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions:
        "You are a strict coffee-shop feedback analyzer. Return ONLY valid JSON. No extra text.",
      input: `Return JSON with keys:
overall_sentiment (positive|neutral|negative|mixed),
overall_rating (1-5 or null),
product_mentions (array of {name, sentiment, evidence}),
service_topics (array of {topic, sentiment, evidence}),
summary (string),
action (string).
Transcript:
${transcript || ""}`,
    });

    const text = (response.output_text || "").trim();

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      // fallback nếu model trả text không chuẩn JSON
      analysis = { raw: text };
    }

    return Response.json({ analysis });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
