const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+";
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

function randomIndex(max: number): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

function randomChar(pool: string): string {
  return pool[randomIndex(pool.length)];
}

// `crypto.getRandomValues`, one character of each class, then a Fisher-Yates shuffle.
export function generateSecurePassword(length = 16): string {
  const required = [
    randomChar(LOWERCASE),
    randomChar(UPPERCASE),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () =>
    randomChar(ALL_CHARS),
  );
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
