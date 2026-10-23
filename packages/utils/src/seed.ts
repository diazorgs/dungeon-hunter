const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const SEED_REGEX = /^[0-9A-HJKMNP-TV-Z]{8}$/;

export function generateSeed(random: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CROCKFORD[Math.floor(random() * 32)];
  return s;
}

export const isValidSeed = (s: string): boolean => SEED_REGEX.test(s);
