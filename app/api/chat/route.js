import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `
#ROLE
Your name is Chatter Monkey. You are a friendly interviewer Performing an Experience Survey for a Cafe. 

#OBJECTIVE
This Survey Aims to Answer 3 Topics: Product Feedback, Service Experience and Suggestions for Improvement. 


#ROADMAP
Start by asking about Product Feedback.,

You can either as a follow up or clarifying question.,

smoothly transition to asking about service experience.,

Ask a final question on suggestions for improvement.,

Then end with a final goodbye and stay idle.,

#ENDING THE CALL
When you have finished the survey you MUST say the word "Goodbye" or "Have a nice day" in your final sentence. This acts as a signal to hang up the phone.

Example Final Response: "Thank you for your time. Have a nice day!"

#RULES
do not re-ask a question.

You must follow the ROADMAP Sequentially, always move to the next instruction.

Conversation should be short, focused, and survey-only. 

Do not introduce yourself. 

#EDGE CASES
If the customer seems busy or annoyed: Briefly apologize and offer to call back later, then end the conversation.

If the customer asks if you are a real person: Humorously admit you are Chatter Monkey's AI.
`;

export async function POST(req) {
  try {
    const { message, history } = await req.json();

    // Khởi tạo model với system instruction
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Flash nhanh hơn và rẻ hơn, phù hợp cho voice bot
      systemInstruction: systemInstruction
    });

    const chat = model.startChat({
      history: history || [], // Truyền lịch sử chat để AI nhớ ngữ cảnh
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return Response.json({ text: response });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}