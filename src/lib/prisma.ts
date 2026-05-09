import { PrismaClient } from '@prisma/client';
import { encryptToken, decryptToken } from './crypto';

const TOKEN_FIELDS = ['access_token', 'refresh_token', 'id_token'] as const;

function encryptAccountTokens(data: Record<string, unknown>): void {
  for (const field of TOKEN_FIELDS) {
    if (typeof data[field] === 'string') {
      data[field] = encryptToken(data[field] as string);
    }
  }
}

function decryptAccountTokens(data: Record<string, unknown>): void {
  for (const field of TOKEN_FIELDS) {
    if (typeof data[field] === 'string') {
      try {
        data[field] = decryptToken(data[field] as string);
      } catch {
        // Already plaintext or unrelated format — leave as-is (handles migration)
      }
    }
  }
}

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      account: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ operation, args, query }: { operation: string; args: any; query: (a: any) => Promise<any> }) {
          const writeOps = new Set(['create', 'update', 'upsert', 'updateMany']);
          if (writeOps.has(operation)) {
            if (args.data) encryptAccountTokens(args.data);
            if (args.create) encryptAccountTokens(args.create);
            if (args.update) encryptAccountTokens(args.update);
          }

          const result = await query(args);

          if (result && typeof result === 'object') {
            if (Array.isArray(result)) {
              for (const r of result) {
                if (r && typeof r === 'object') decryptAccountTokens(r as Record<string, unknown>);
              }
            } else if ('access_token' in result || 'refresh_token' in result) {
              decryptAccountTokens(result as Record<string, unknown>);
            }
          }
          return result;
        },
      },
    },
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

declare global {
  var prisma: undefined | PrismaClientSingleton;
}

const prisma = (globalThis.prisma ?? prismaClientSingleton()) as PrismaClientSingleton;

export { prisma };

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
