import type { ArmoryItemRef, RunResult } from "@dh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { use } from "react";
import { PROFILE, RepoContext } from "./context.ts";
import type { Profile, ProfileRepository } from "./types.ts";

export function useRepository(): ProfileRepository {
  const repo = use(RepoContext);
  if (!repo) throw new Error("useRepository outside ProfileRepositoryProvider");
  return repo;
}

export function useProfile() {
  const repo = useRepository();
  return useQuery({ queryKey: PROFILE, queryFn: () => repo.load() });
}

function useProfileMutation<T, R>(fn: (arg: T) => Promise<R>, pick: (r: R) => Profile) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => qc.setQueryData(PROFILE, pick(r)),
  });
}

export function useSubmitRun() {
  const repo = useRepository();
  return useProfileMutation(
    (r: RunResult) => repo.submitRun(r),
    (r) => r.profile,
  );
}

export function usePurchase() {
  const repo = useRepository();
  return useProfileMutation(
    (ref: ArmoryItemRef) => repo.purchase(ref),
    (p) => p,
  );
}

export function useMarkSeen() {
  const repo = useRepository();
  return useProfileMutation(
    (flag: "intro" | "ending") => repo.markSeen(flag),
    (p) => p,
  );
}
