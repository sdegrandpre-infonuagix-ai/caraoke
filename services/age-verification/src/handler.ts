// Age verification Lambda (Story 5.2, FR32, NFR11).
//
// Two routes:
//   POST /age-verification/session  — creates a Stripe Identity VerificationSession for the
//     device to present. Returns { clientSecret, sessionId }. The Stripe secret key lives in
//     AWS Secrets Manager (never in env vars or device).
//
//   GET  /age-verification/result   — retrieves the session status and computes is18Plus from
//     the verified DOB. Only the boolean is returned to the caller — never the raw document.
//     The caller stores only { is18Plus, verificationRef } (NFR11).
//
// Stripe sends webhooks when verification completes. For the result endpoint we query the
// session directly so the app gets an immediate answer after FlowCompleted without waiting.

import Stripe from 'stripe';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? 'ca-central-1',
});

let cachedStripe: Stripe | null = null;

async function getStripe(): Promise<Stripe> {
  if (cachedStripe) return cachedStripe;
  const cmd = new GetSecretValueCommand({ SecretId: 'caraoke/stripe-secret-key' });
  const resp = await secretsClient.send(cmd);
  const { stripeSecretKey } = JSON.parse(resp.SecretString ?? '{}') as { stripeSecretKey: string };
  cachedStripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
  return cachedStripe;
}

const ok = (body: unknown) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const err = (status: number, message: string) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: message }),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? '';

  try {
    const stripe = await getStripe();

    // ── POST /age-verification/session ────────────────────────────────────────
    if (method === 'POST' && path === '/age-verification/session') {
      const session = await stripe.identity.verificationSessions.create({
        type: 'document',
        options: {
          document: {
            require_matching_selfie: true,
          },
        },
        metadata: { purpose: 'age_verification' },
      });

      // client_secret goes to the device — safe, scoped to this single session only.
      return ok({ clientSecret: session.client_secret, sessionId: session.id });
    }

    // ── GET /age-verification/result?sessionId=vs_xxx ─────────────────────────
    if (method === 'GET' && path === '/age-verification/result') {
      const sessionId = new URLSearchParams(event.rawQueryString ?? '').get('sessionId');
      if (!sessionId) return err(400, 'sessionId required');

      const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
        expand: ['verified_outputs'],
      });

      let is18Plus = false;
      if (session.status === 'verified') {
        const dob = (session.verified_outputs as Stripe.Identity.VerificationSession.VerifiedOutputs | null)?.dob;
        if (dob?.year && dob?.month && dob?.day) {
          const birthDate = new Date(dob.year, dob.month - 1, dob.day);
          const ageMs = Date.now() - birthDate.getTime();
          const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
          is18Plus = ageYears >= 18;
        }
      }

      // Return only the boolean — never the document, image, or DOB (NFR11).
      return ok({ is18Plus });
    }

    return err(404, 'Not found');
  } catch (e) {
    console.error('[age-verification] unhandled error', e);
    return err(500, 'Internal error');
  }
};
