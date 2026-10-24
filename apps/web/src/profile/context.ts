import { createContext } from "react";
import type { ProfileRepository } from "./types.ts";

export const RepoContext = createContext<ProfileRepository | null>(null);
export const PROFILE = ["profile"] as const;
