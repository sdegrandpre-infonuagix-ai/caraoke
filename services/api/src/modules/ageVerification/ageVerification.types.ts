export interface AgeVerificationSessionResponse {
  clientSecret: string;
  sessionId: string;
}

export interface AgeVerificationResultResponse {
  is18Plus: boolean;
}
