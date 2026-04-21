import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";

import { deliverReminderById } from "@/lib/tasks/reminder-delivery";

interface ReminderQueueConfig {
  region: string;
  queueUrl: string;
}

interface SqsMessage {
  messageId: string;
  receiptHandle: string;
  body: string;
}

export interface ConsumeReminderQueueResult {
  polledCount: number;
  processedCount: number;
  deletedCount: number;
  firedCount: number;
  failedCount: number;
  invalidCount: number;
  skippedCount: number;
  details: Array<{
    messageId: string;
    reminderId?: string;
    outcome: string;
  }>;
}

const SQS_SERVICE = "sqs";
const SQS_CONTENT_TYPE = "application/x-www-form-urlencoded; charset=utf-8";
const SQS_API_VERSION = "2012-11-05";

function getReminderQueueConfig(): ReminderQueueConfig | null {
  const region = process.env.AWS_REGION?.trim() ?? process.env.NEXT_PUBLIC_AWS_REGION?.trim();
  const queueUrl = process.env.KIN_REMINDER_QUEUE_URL?.trim();

  if (!region || !queueUrl) {
    return null;
  }

  return { region, queueUrl };
}

function escapeXml(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function parseTag(text: string, tagName: string): string | null {
  const pattern = new RegExp(`<${escapeXml(tagName)}>([\\s\\S]*?)</${escapeXml(tagName)}>`);
  const match = text.match(pattern);
  return match?.[1] ? decodeXml(match[1].trim()) : null;
}

function parseSqsMessages(xml: string): SqsMessage[] {
  const messages: SqsMessage[] = [];
  const pattern = /<Message>([\s\S]*?)<\/Message>/g;
  let match: RegExpExecArray | null = pattern.exec(xml);

  while (match) {
    const block = match[1] ?? "";
    const messageId = parseTag(block, "MessageId");
    const receiptHandle = parseTag(block, "ReceiptHandle");
    const body = parseTag(block, "Body");

    if (messageId && receiptHandle && body !== null) {
      messages.push({
        messageId,
        receiptHandle,
        body,
      });
    }

    match = pattern.exec(xml);
  }

  return messages;
}

function parseReminderIdFromMessageBody(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { reminderId?: unknown };
    return typeof parsed.reminderId === "string" && parsed.reminderId.trim().length > 0
      ? parsed.reminderId.trim()
      : null;
  } catch {
    return null;
  }
}

async function readBody(body: unknown): Promise<string> {
  if (!body) {
    return "";
  }

  if (typeof body === "string") {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString("utf-8");
  }

  const chunks: Uint8Array[] = [];

  for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf-8");
}

async function sqsQueryRequest(params: {
  config: ReminderQueueConfig;
  payload: URLSearchParams;
}): Promise<string> {
  const credentials = defaultProvider();
  const signer = new SignatureV4({
    credentials,
    region: params.config.region,
    service: SQS_SERVICE,
    sha256: Sha256,
  });
  const url = new URL(params.config.queueUrl);
  const body = params.payload.toString();
  const host = url.host;
  const path = url.pathname.length > 0 ? url.pathname : "/";
  const request = new HttpRequest({
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    method: "POST",
    path,
    headers: {
      host,
      "content-type": SQS_CONTENT_TYPE,
      "content-length": String(Buffer.byteLength(body)),
    },
    body,
  });

  const signedRequest = await signer.sign(request);
  const handler = new NodeHttpHandler();
  const { response } = await handler.handle(signedRequest as HttpRequest);
  const responseBody = await readBody(response.body);

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return responseBody;
  }

  const message = responseBody.trim() || "SQS request failed";
  throw new Error(`SQS request failed (${response.statusCode}): ${message}`);
}

async function receiveReminderMessages(params: {
  config: ReminderQueueConfig;
  maxMessages: number;
  waitSeconds: number;
}): Promise<SqsMessage[]> {
  const payload = new URLSearchParams({
    Action: "ReceiveMessage",
    Version: SQS_API_VERSION,
    MaxNumberOfMessages: String(params.maxMessages),
    WaitTimeSeconds: String(params.waitSeconds),
  });
  const xml = await sqsQueryRequest({
    config: params.config,
    payload,
  });

  return parseSqsMessages(xml);
}

async function deleteReminderMessage(params: {
  config: ReminderQueueConfig;
  receiptHandle: string;
}): Promise<void> {
  const payload = new URLSearchParams({
    Action: "DeleteMessage",
    Version: SQS_API_VERSION,
    ReceiptHandle: params.receiptHandle,
  });

  await sqsQueryRequest({
    config: params.config,
    payload,
  });
}

export async function consumeReminderQueue(params?: {
  maxMessages?: number;
  waitSeconds?: number;
}): Promise<ConsumeReminderQueueResult | { kind: "disabled" }> {
  const config = getReminderQueueConfig();

  if (!config) {
    return { kind: "disabled" };
  }

  const maxMessages = Math.max(1, Math.min(10, params?.maxMessages ?? 5));
  const waitSeconds = Math.max(0, Math.min(20, params?.waitSeconds ?? 10));
  const messages = await receiveReminderMessages({
    config,
    maxMessages,
    waitSeconds,
  });

  let processedCount = 0;
  let deletedCount = 0;
  let firedCount = 0;
  let failedCount = 0;
  let invalidCount = 0;
  let skippedCount = 0;
  const details: ConsumeReminderQueueResult["details"] = [];

  for (const message of messages) {
    try {
      const reminderId = parseReminderIdFromMessageBody(message.body);

      if (!reminderId) {
        invalidCount += 1;
        details.push({
          messageId: message.messageId,
          outcome: "invalid_message_body",
        });
      } else {
        processedCount += 1;
        const deliveryResult = await deliverReminderById({
          reminderId,
          requireClaimed: false,
          missingDestination: "fail",
        });

        if (deliveryResult.kind === "fired") {
          firedCount += 1;
        } else if (deliveryResult.kind === "failed") {
          failedCount += 1;
        } else {
          skippedCount += 1;
        }

        details.push({
          messageId: message.messageId,
          reminderId,
          outcome: deliveryResult.kind,
        });
      }

      await deleteReminderMessage({
        config,
        receiptHandle: message.receiptHandle,
      });
      deletedCount += 1;
    } catch (error) {
      console.error("Failed to process reminder SQS message", {
        messageId: message.messageId,
        error,
      });
      details.push({
        messageId: message.messageId,
        outcome: "processing_error",
      });
    }
  }

  return {
    polledCount: messages.length,
    processedCount,
    deletedCount,
    firedCount,
    failedCount,
    invalidCount,
    skippedCount,
    details,
  };
}
