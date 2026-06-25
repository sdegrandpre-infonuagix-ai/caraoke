import { z } from 'zod';

/** Join a session by invite token (from a link) or pairing code (typed). Exactly one. */
export const joinSessionSchema = z
  .object({
    token: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.token) !== Boolean(v.code), {
    message: 'Provide exactly one of token or code.',
  });

export type JoinSessionInput = z.infer<typeof joinSessionSchema>;

/** Save a known partner by their user id (FR9). */
export const savePartnerSchema = z.object({
  partnerUserId: z.string().uuid(),
});

export type SavePartnerInput = z.infer<typeof savePartnerSchema>;
