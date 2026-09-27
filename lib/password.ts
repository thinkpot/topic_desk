import bcrypt from "bcryptjs";

const COST = 12;

// A real bcrypt hash of a random string nobody knows, at the same cost as real
// ones — login compares against it when the email doesn't exist, so an unknown
// email takes as long to reject as a wrong password (no timing enumeration).
const DUMMY_HASH = bcrypt.hashSync(`dummy-${Math.random()}`, COST);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

/** Always runs one bcrypt compare, whether or not the account exists. */
export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  const valid = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return valid && !!hash;
}
