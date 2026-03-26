import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
try {
const body = await req.json();

const { email, password, familyName, assistantName } = body;

if (!email || !password || !familyName || !assistantName) {
return NextResponse.json(
{ error: "Missing required fields" },
{ status: 400 }
);
}

const existingUser = await prisma.user.findUnique({
where: { email },
});

if (existingUser) {
return NextResponse.json(
{ error: "User already exists" },
{ status: 409 }
);
}

const hashedPassword = await bcrypt.hash(password, 10);

const user = await prisma.user.create({
data: {
email,
password: hashedPassword,
},
});

const family = await prisma.family.create({
data: {
name: familyName,
userId: user.id,
},
});

const assistant = await prisma.assistant.create({
data: {
name: assistantName,
status: "active",
runtimeType: "openclaw",
familyId: family.id,
},
});

const messagingConnection = await prisma.messagingConnection.create({
data: {
familyId: family.id,
platform: "whatsapp",
status: "unlinked",
},
});

return NextResponse.json({
message: "Kin family assistant created successfully",
user: {
id: user.id,
email: user.email,
},
family,
assistant,
messagingConnection,
});
} catch (error) {
console.error("Setup error:", error);
return NextResponse.json(
{ error: "Internal server error" },
{ status: 500 }
);
}
}