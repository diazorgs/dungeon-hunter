export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  userId: string;
}

/** Everything routes need from storage; tests swap in the memory implementation. */
export interface Repo {
  createUser(
    email: string,
    password: string,
  ): Promise<{ userId: string } | { error: "EMAIL_TAKEN" }>;
  deleteUser(userId: string): Promise<void>;
  signIn(email: string, password: string): Promise<Session | null>;
  refresh(refreshToken: string): Promise<Session | null>;
  verifyAccessToken(token: string): Promise<{ userId: string } | null>;
  createProfile(
    userId: string,
    username: string,
  ): Promise<{ ok: true } | { error: "USERNAME_TAKEN" }>;
}
