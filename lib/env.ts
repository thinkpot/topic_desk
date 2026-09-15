function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  get appUrl(): string {
    return required("APP_URL").replace(/\/+$/, "");
  },
  get jwtSecret(): string {
    return required("JWT_SECRET");
  },
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
};
