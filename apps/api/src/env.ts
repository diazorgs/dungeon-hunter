import type { Repo } from "./db/repo.ts";

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  WEB_ORIGIN: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: { repo: Repo; userId: string };
};
