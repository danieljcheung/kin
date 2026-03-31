import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

let cognitoClient: CognitoIdentityProviderClient | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getCognitoClient() {
  if (cognitoClient) {
    return cognitoClient;
  }

  const region = getRequiredEnv("AWS_REGION") || getRequiredEnv("AWS_DEFAULT_REGION");

  if (!region) {
    throw new Error("AWS region is required for Cognito admin deletion.");
  }

  cognitoClient = new CognitoIdentityProviderClient({ region });
  return cognitoClient;
}

export function isCognitoAdminDeletionConfigured() {
  return Boolean(
    getRequiredEnv("KIN_COGNITO_USER_POOL_ID") &&
      (getRequiredEnv("AWS_REGION") || getRequiredEnv("AWS_DEFAULT_REGION")),
  );
}

export async function deleteCognitoUser(cognitoSub: string) {
  const userPoolId = getRequiredEnv("KIN_COGNITO_USER_POOL_ID");

  if (!userPoolId) {
    throw new Error("KIN_COGNITO_USER_POOL_ID is required for Cognito admin deletion.");
  }

  await getCognitoClient().send(
    new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: cognitoSub,
    }),
  );
}
