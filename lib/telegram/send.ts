const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    replyToMessageId?: string | null;
  },
) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  const replyToMessageId =
    options?.replyToMessageId && /^\d+$/.test(options.replyToMessageId)
      ? Number(options.replyToMessageId)
      : undefined;

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(replyToMessageId
        ? {
            reply_parameters: {
              message_id: replyToMessageId,
            },
          }
        : {}),
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
  }

  return data;
}
