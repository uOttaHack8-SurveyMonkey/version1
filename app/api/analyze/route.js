import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Đường dẫn tới file JSON database
const dbPath = path.join(process.cwd(), 'data', 'surveys.json');

// Helper: Đọc dữ liệu
function getData() {
  if (!fs.existsSync(dbPath)) return [];
  const fileContent = fs.readFileSync(dbPath, 'utf8');
  if (!fileContent) return [];
  return JSON.parse(fileContent);
}

// Helper: Lưu dữ liệu
function saveData(newData) {
  const currentData = getData();
  currentData.push(newData);
  fs.writeFileSync(dbPath, JSON.stringify(currentData, null, 2));
}

// Prompt cho Gemini
const ANALYSIS_PROMPT = `
Bạn là chuyên gia Data Analyst. Hãy trích xuất thông tin từ cuộc gọi khảo sát này thành JSON.
BẮT BUỘC trả về JSON thuần túy, không markdown.
Format:
{
  "customer_mood": "Positive" | "Neutral" | "Negative",
  "ordered_item": "Tên món (VD: Latte, Cappuccino, Unknown)",
  "rating_score": số (1-5, hoặc 0 nếu không có),
  "key_feedback": "Tóm tắt ngắn gọn (max 10 từ)",
  "timestamp": "ISO Date String hiện tại"
}
Đoạn chat:
`;

// 1. XỬ LÝ POST: Phân tích và Lưu
export async function POST(req) {
  try {
    const { history } = await req.json();
    
    // Convert history object thành text để Gemini đọc
    const conversationText = history.map(msg => `${msg.role}: ${msg.content}`).join("\n");

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    // Gọi Gemini
    const result = await model.generateContent(ANALYSIS_PROMPT + conversationText);
    const analysisResult = JSON.parse(result.response.text());

    // Bổ sung thời gian thực
    const finalRecord = {
        ...analysisResult,
        timestamp: new Date().toISOString(),
        id: Date.now().toString() // Fake ID
    };

    // LƯU VÀO FILE JSON
    saveData(finalRecord);
    
    return NextResponse.json({ success: true, data: finalRecord });

  } catch (error) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. XỬ LÝ GET: Lấy dữ liệu cho Dashboard
export async function GET() {
    try {
        const data = getData();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Cannot read data" }, { status: 500 });
    }
}