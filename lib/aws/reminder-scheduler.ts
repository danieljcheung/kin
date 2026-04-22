import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  SchedulerClient,
  SchedulerServiceException,
} from "@aws-sdk/client-scheduler";

interface ReminderSchedulerConfig {
  region: string;
  roleArn: string;
  queueArn: string;
  groupName: string;
}

export type CreateReminderScheduleResult =
  | { kind: "disabled" }
  | { kind: "created"; scheduleName: string }
  | { kind: "already_exists"; scheduleName: string };

export type DeleteReminderScheduleResult =
  | { kind: "disabled" }
  | { kind: "deleted" }
  | { kind: "not_found" };

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

const schedulerClientsByRegion = new Map<string, SchedulerClient>();

function getSchedulerClient(region: string): SchedulerClient {
  const existing = schedulerClientsByRegion.get(region);

  if (existing) {
    return existing;
  }

  const client = new SchedulerClient({ region });
  schedulerClientsByRegion.set(region, client);
  return client;
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
    const client = getSchedulerClient(config.region);

    await client.send(
      new CreateScheduleCommand({
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
      }),
    );

    return {
      kind: "created",
      scheduleName,
    };
  } catch (error) {
    if (error instanceof SchedulerServiceException && error.name === "ConflictException") {
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
    const client = getSchedulerClient(config.region);

    await client.send(
      new DeleteScheduleCommand({
        Name: params.scheduleName,
        GroupName: config.groupName,
      }),
    );

    return { kind: "deleted" };
  } catch (error) {
    if (error instanceof SchedulerServiceException && error.name === "ResourceNotFoundException") {
      return { kind: "not_found" };
    }

    throw error;
  }
}
