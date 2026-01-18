import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { messages } = await req.json();
    // messages: [{ role: "user"|"assistant", content: "..."}, ...]

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
        status: 400,
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction:
        'You are "Chatter Monkey (Mochi)", a friendly barista monkey calling on behalf of a cafe. Keep replies short (1-2 sentences). Ask at most 3 questions total. Focus on: drink/food quality, service speed, cleanliness, and one suggestion. End politely when enough info is collected.',
    });

    // MVP: gộp hội thoại thành 1 prompt
    const transcript = (messages || [])
      .map((m) => `${String(m.role).toUpperCase()}: ${m.content}`)
      .join("\n");

    const result = await model.generateContent(transcript);
    const reply = result.response.text();

    return Response.json({ reply });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
