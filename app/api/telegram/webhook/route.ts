import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
const myChatMember = body?.my_chat_member;

const chat = message?.chat;
const chatId = chat?.id;
const chatType = chat?.type;
const chatTitle = chat?.title;
const text = message?.text;
const from = message?.from;

const memberChat = myChatMember?.chat;
const memberChatId = memberChat?.id;
const memberChatType = memberChat?.type;
const memberChatTitle = memberChat?.title;
const memberFrom = myChatMember?.from;
const oldChatMember = myChatMember?.old_chat_member;
const newChatMember = myChatMember?.new_chat_member;

console.log("telegram parsed message event", {
chatId,
chatType,
chatTitle,
text,
from,
});

console.log("telegram parsed membership event", {
memberChatId,
memberChatType,
memberChatTitle,
memberFrom,
oldChatMember,
newChatMember,
});

if (chatId && typeof text === "string" && text.startsWith("/start")) {
const token = extractStartToken(text);

if (token) {
const binding = await prisma.groupBinding.findUnique({
where: {
onboardingToken: token,
},
include: {
family: true,
},
});

if (!binding) {
await sendTelegramMessage(
chatId,
"That setup link is invalid or expired. Go back to Kin and generate a new one.",
);
return NextResponse.json({ ok: true });
}

await prisma.groupBinding.update({
where: {
id: binding.id,
},
data: {
status: "DM_STARTED",
},
});

await sendTelegramMessage(
chatId,
`Got it — this setup link is for ${binding.family.name}. Next, add this bot to your family Telegram group, then send any message in that group so I can finish setup.`,
);
} else {
await sendTelegramMessage(chatId, "Kin is connected. Setup flow coming next.");
}
}

if (
memberChatId &&
(memberChatType === "group" || memberChatType === "supergroup")
) {
console.log("Bot membership changed in group", {
memberChatId,
memberChatTitle,
memberFrom,
oldStatus: oldChatMember?.status,
newStatus: newChatMember?.status,
});

const pendingBinding = await prisma.groupBinding.findFirst({
where: {
status: "DM_STARTED",
},
orderBy: {
updatedAt: "desc",
},
include: {
family: true,
},
});

if (!pendingBinding) {
console.log("No pending DM_STARTED binding found for group activation");
return NextResponse.json({ ok: true });
}

await prisma.groupBinding.update({
where: {
id: pendingBinding.id,
},
data: {
status: "ACTIVE",
externalGroupId: String(memberChatId),
groupName: memberChatTitle ?? null,
verifiedAt: new Date(),
},
});

await prisma.onboardingState.update({
where: {
familyId: pendingBinding.familyId,
},
data: {
status: "COMPLETE",
currentStep: "COMPLETE",
},
});

console.log("Activated Telegram group binding", {
bindingId: pendingBinding.id,
familyId: pendingBinding.familyId,
memberChatId,
memberChatTitle,
});
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