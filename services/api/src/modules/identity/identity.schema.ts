import { z } from 'zod';

/** Editable profile fields (FR1). At least one must be present on a PATCH. */
export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(60).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'No updatable fields provided.',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
