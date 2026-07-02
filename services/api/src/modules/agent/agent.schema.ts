import { z } from 'zod';

/** Zod schema for the POST /sessions/:id/agent request body. */
export const songRequestSchema = z.object({
  query: z.string().min(1, 'Song query must not be empty').max(200),
});

export type SongRequestBody = z.infer<typeof songRequestSchema>;
