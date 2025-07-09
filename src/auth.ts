import { Elysia, t } from 'elysia';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from './db';
import { apiKeys } from './db/schema';

export const auth = new Elysia()
  .derive(async ({ headers, params }) => {
    const apiKey = headers['x-api-key'];
    const namespace = (params as any)?.namespace;
    
    if (!apiKey) {
      throw new Error('Missing API key');
    }

    if (!namespace) {
      throw new Error('Missing namespace');
    }

    const keyRecord = await db.select().from(apiKeys)
      .where(and(
        eq(apiKeys.apiKey, apiKey),
        eq(apiKeys.namespace, namespace),
        isNull(apiKeys.deletedAt)
      ))
      .limit(1);

    if (keyRecord.length === 0) {
      throw new Error('Invalid API key or insufficient permissions for namespace');
    }

    return {
      namespace: keyRecord[0]!.namespace,
      apiKey: keyRecord[0]!.apiKey,
    };
  });

export const masterAuth = new Elysia()
  .derive(async ({ headers }) => {
    const apiKey = headers['x-master-api-key'];
    
    if (!apiKey) {
      throw new Error('Missing master API key');
    }

    const masterKeys = process.env.MASTER_API_KEYS?.split(',').filter(Boolean) || [];
    
    if (!masterKeys.includes(apiKey)) {
      throw new Error('Invalid master API key');
    }

    return {
      isMaster: true,
    };
  });