import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";

interface ReminderSchedulerConfig {
  region: string;
  roleArn: string;
  queueArn: string;
  groupName: string;
}

interface SchedulerApiError {
  __type?: string;
  message?: string;
}

export type CreateReminderScheduleResult =
  | { kind: "disabled" }
  | { kind: "created"; scheduleName: string }
  | { kind: "already_exists"; scheduleName: string };

export type DeleteReminderScheduleResult =
  | { kind: "disabled" }
  | { kind: "deleted" }
  | { kind: "not_found" };

const SCHEDULER_SERVICE = "scheduler";
const SCHEDULER_CONTENT_TYPE = "application/x-amz-json-1.1";
const SCHEDULER_USER_AGENT = "kin-reminder-scheduler/1";

function getReminderSchedulerConfig(): ReminderSchedulerConfig | null {
  const region = process.env.AWS_REGION?.trim() ?? process.env.NEXT_PUBLIC_AWS_REGION?.trim();
  const roleArn = process.env.KIN_REMINDER_SCHEDULER_ROLE_ARN?.trim();
  const queueUrl = process.env.KIN_REMINDER_QUEUE_URL?.trim();
  const groupName = process.env.KIN_REMINDER_SCHEDULER_GROUP_NAME?.trim() || "default";

  if (!region || !roleArn || !queueUrl) {
    return null;
  }

  const queueArn = deriveQueueArnFromUrl(queueUrl, region);

  if (!queueArn) {
    return null;
  }

  return {
    region,
    roleArn,
    queueArn,
    groupName,
  };
}

function deriveQueueArnFromUrl(queueUrl: string, defaultRegion: string): string | null {
  try {
    const url = new URL(queueUrl);
    const pathParts = url.pathname
      .split("/")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (pathParts.length < 2) {
      return null;
    }

    const accountId = pathParts[0];
    const queueName = pathParts.slice(1).join("/");
    const hostParts = url.hostname.split(".");
    const hostRegion = hostParts.length >= 3 && hostParts[0] === "sqs" ? hostParts[1] : null;
    const region = hostRegion && hostRegion.length > 0 ? hostRegion : defaultRegion;

    if (!accountId || !queueName || !region) {
      return null;
    }

    return `arn:aws:sqs:${region}:${accountId}:${queueName}`;
  } catch {
    return null;
  }
}

export function buildReminderScheduleName(reminderId: string): string {
  return `kin-reminder-${reminderId}`;
}

function formatAtExpression(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
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

function parseSchedulerErrorType(error: SchedulerApiError): string {
  const raw = error.__type ?? "";
  const value = raw.includes("#") ? raw.split("#").at(-1) ?? raw : raw;
  return value.trim();
}

async function schedulerJsonRpc<TResponse>(params: {
  config: ReminderSchedulerConfig;
  operation: "CreateSchedule" | "DeleteSchedule";
  payload: Record<string, unknown>;
}): Promise<TResponse> {
  const host = `scheduler.${params.config.region}.amazonaws.com`;
  const body = JSON.stringify(params.payload);
  const credentials = defaultProvider();
  const signer = new SignatureV4({
    credentials,
    region: params.config.region,
    service: SCHEDULER_SERVICE,
    sha256: Sha256,
  });

  const request = new HttpRequest({
    protocol: "https:",
    hostname: host,
    method: "POST",
    path: "/",
    headers: {
      host,
      "content-type": SCHEDULER_CONTENT_TYPE,
      "x-amz-target": `AWSScheduler.${params.operation}`,
      "user-agent": SCHEDULER_USER_AGENT,
      "content-length": String(Buffer.byteLength(body)),
    },
    body,
  });

  const signedRequest = await signer.sign(request);
  const handler = new NodeHttpHandler();
  const { response } = await handler.handle(signedRequest as HttpRequest);
  const responseBody = await readBody(response.body);

  if (response.statusCode >= 200 && response.statusCode < 300) {
    if (!responseBody) {
      return {} as TResponse;
    }

    return JSON.parse(responseBody) as TResponse;
  }

  let parsedError: SchedulerApiError = {};

  if (responseBody) {
    try {
      parsedError = JSON.parse(responseBody) as SchedulerApiError;
    } catch {
      parsedError = {
        message: responseBody,
      };
    }
  }

  const errorType = parseSchedulerErrorType(parsedError);
  const errorMessage = parsedError.message?.trim() || "Scheduler API request failed";

  const error = new Error(`${params.operation} failed (${response.statusCode}): ${errorMessage}`) as Error & {
    schedulerErrorType?: string;
  };

  error.schedulerErrorType = errorType;

  throw error;
}

export async function createReminderSchedule(params: {
  reminderId: string;
  scheduledFor: Date;
}): Promise<CreateReminderScheduleResult> {
  const config = getReminderSchedulerConfig();

  if (!config) {
    return { kind: "disabled" };
  }

  const scheduleName = buildReminderScheduleName(params.reminderId);

  try {
    await schedulerJsonRpc({
      config,
      operation: "CreateSchedule",
      payload: {
        Name: scheduleName,
        GroupName: config.groupName,
        ScheduleExpression: `at(${formatAtExpression(params.scheduledFor)})`,
        FlexibleTimeWindow: {
          Mode: "OFF",
        },
        ActionAfterCompletion: "DELETE",
        Target: {
          Arn: config.queueArn,
          RoleArn: config.roleArn,
          Input: JSON.stringify({
            reminderId: params.reminderId,
          }),
        },
      },
    });

    return {
      kind: "created",
      scheduleName,
    };
  } catch (error) {
    const schedulerErrorType =
      typeof error === "object" && error && "schedulerErrorType" in error
        ? String((error as { schedulerErrorType?: string }).schedulerErrorType)
        : "";

    if (schedulerErrorType === "ConflictException") {
      return {
        kind: "already_exists",
        scheduleName,
      };
    }

    throw error;
  }
}

export async function deleteReminderSchedule(params: {
  scheduleName: string;
}): Promise<DeleteReminderScheduleResult> {
  const config = getReminderSchedulerConfig();

  if (!config) {
    return { kind: "disabled" };
  }

  try {
    await schedulerJsonRpc({
      config,
      operation: "DeleteSchedule",
      payload: {
        Name: params.scheduleName,
        GroupName: config.groupName,
      },
    });

    return { kind: "deleted" };
  } catch (error) {
    const schedulerErrorType =
      typeof error === "object" && error && "schedulerErrorType" in error
        ? String((error as { schedulerErrorType?: string }).schedulerErrorType)
        : "";

    if (schedulerErrorType === "ResourceNotFoundException") {
      return { kind: "not_found" };
    }

    throw error;
  }
}
