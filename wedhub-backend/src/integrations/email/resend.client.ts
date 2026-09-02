import { Resend } from "resend";
import { env } from "../../config/env";
import { ExternalServiceError } from "../../common/errors";

let client: Resend | undefined;

function isConfigured(): boolean {
  return !!env.RESEND_API_KEY;
}

function getClient(): Resend {
  if (!isConfigured()) {
    throw new ExternalServiceError("Email provider is not configured. Set RESEND_API_KEY.");
  }
  if (!client) {
    client = new Resend(env.RESEND_API_KEY as string);
  }
  return client;
}

export function isEmailProviderConfigured(): boolean {
  return isConfigured();
}

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<{ id: string }> {
  const result = await getClient().emails.send({
    from: env.EMAIL_FROM_ADDRESS,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (result.error) {
    throw new ExternalServiceError(`Resend rejected the email: ${result.error.message}`, { name: result.error.name });
  }
  return { id: result.data?.id ?? "" };
}
