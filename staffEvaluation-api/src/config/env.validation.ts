type Rule = { key: string; required: boolean; productionOnly?: boolean };

const RULES: Rule[] = [
  { key: 'DATABASE_URL', required: true },
  { key: 'JWT_SECRET', required: true },
  { key: 'JWT_REFRESH_SECRET', required: true, productionOnly: true },
  { key: 'JWT_EXPIRES_IN', required: false },
  { key: 'PORT', required: false },
  { key: 'NODE_ENV', required: false },
  { key: 'CORS_ORIGINS', required: true, productionOnly: true },
  { key: 'AZURE_CLIENT_ID', required: false },
  { key: 'AZURE_CLIENT_SECRET', required: false },
  { key: 'AZURE_TENANT_ID', required: false },
  { key: 'OPENROUTER_API_KEY', required: false },
];

export function validateEnv(env: NodeJS.ProcessEnv): void {
  const isProd = env.NODE_ENV === 'production';
  const missing: string[] = [];

  for (const rule of RULES) {
    if (!rule.required) continue;
    if (rule.productionOnly && !isProd) continue;
    const value = env[rule.key];
    if (!value || value.trim() === '') {
      missing.push(rule.key);
    }
  }

  if (isProd && env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    missing.push('JWT_SECRET (must be ≥32 chars in production)');
  }

  if (isProd && env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length < 32) {
    missing.push('JWT_REFRESH_SECRET (must be ≥32 chars in production)');
  }

  if (isProd && env.JWT_SECRET && env.JWT_REFRESH_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    missing.push('JWT_REFRESH_SECRET (must differ from JWT_SECRET in production)');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Copy .env.example to .env and fill in the values.`,
    );
  }
}
