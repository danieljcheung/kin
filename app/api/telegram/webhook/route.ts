import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number | string, text: string) {
if (!TELEGRAM_BOT_TOKEN) {
throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
chat_id: chatId,
text,
}),
});

const data = await res.json();

if (!res.ok || !data.ok) {
throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
}

return data;
}

function extractStartToken(text: string): string | null {
const trimmed = text.trim();

if (!trimmed.startsWith("/start")) {
return null;
}

const parts = trimmed.split(/\s+/);

if (parts.length < 2) {
return null;
}

return parts.slice(1).join(" ");
}

export async function POST(req: NextRequest) {
try {
const body = await req.json();
console.log("Telegram webhook update:", JSON.stringify(body, null, 2));

const message = body?.message;
const chatId = message?.chat?.id;
const text = message?.text;

if (chatId && typeof text === "string" && text.startsWith("/start")) {
const token = extractStartToken(text);

if (token) {
await sendTelegramMessage(chatId, `Received setup token: ${token}`);
} else {
await sendTelegramMessage(chatId, "Kin is connected. Setup flow coming next.");
}
}

return NextResponse.json({ ok: true });
} catch (error) {
console.error("Telegram webhook error:", error);
return NextResponse.json({ ok: false, error: "invalid request" }, { status: 400 });
}
}

export async function GET() {
return NextResponse.json({
ok: true,
message: "Telegram webhook endpoint is up. Use POST.",
});
}