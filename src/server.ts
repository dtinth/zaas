import swagger from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { eq, and, isNull, count, inArray } from "drizzle-orm";
import { db } from "./db";
import { items, apiKeys } from "./db/schema";
import { auth, masterAuth } from "./auth";

const app = new Elysia()
  .use(swagger())
  .get("/", () => "zaas")
  
  // Main matching endpoint
  .group("/namespaces/:namespace", (app) =>
    app
      .use(auth)
      .post(
        "/match",
        async ({ params: { namespace }, body: { requestor } }) => {
          // Check if requestor already has a matched item
          const existingMatch = await db.select()
            .from(items)
            .where(and(
              eq(items.namespace, namespace),
              eq(items.requestor, requestor),
              isNull(items.deletedAt)
            ))
            .limit(1);

          if (existingMatch.length > 0) {
            return {
              success: true,
              item: existingMatch[0]!.item,
              message: "Item already assigned to this requestor"
            };
          }

          // Find first available item
          const availableItem = await db.select()
            .from(items)
            .where(and(
              eq(items.namespace, namespace),
              isNull(items.requestor),
              isNull(items.deletedAt)
            ))
            .limit(1);

          if (availableItem.length === 0) {
            return {
              success: false,
              message: "No available items in this namespace"
            };
          }

          // Match the item with the requestor
          await db.update(items)
            .set({
              requestor,
              matchedAt: new Date().toISOString()
            })
            .where(eq(items.id, availableItem[0]!.id));

          return {
            success: true,
            item: availableItem[0]!.item,
            message: "Item successfully matched"
          };
        },
        {
          body: t.Object({
            requestor: t.String()
          }),
          response: t.Object({
            success: t.Boolean(),
            item: t.Optional(t.String()),
            message: t.String()
          })
        }
      )
      
      // Get items with optional filtering
      .get(
        "/items",
        async ({ params: { namespace }, query: { item, requestor } }) => {
          let whereConditions = [
            eq(items.namespace, namespace),
            isNull(items.deletedAt)
          ];

          if (item) {
            whereConditions.push(eq(items.item, item));
          }
          
          if (requestor) {
            whereConditions.push(eq(items.requestor, requestor));
          }

          const results = await db.select()
            .from(items)
            .where(and(...whereConditions))
            .orderBy(items.createdAt);

          return {
            items: results.map(item => ({
              item: item.item,
              requestor: item.requestor,
              matchedAt: item.matchedAt
            }))
          };
        },
        {
          query: t.Object({
            item: t.Optional(t.String()),
            requestor: t.Optional(t.String())
          }),
          response: t.Object({
            items: t.Array(t.Object({
              item: t.String(),
              requestor: t.Union([t.String(), t.Null()]),
              matchedAt: t.Union([t.String(), t.Null()])
            }))
          })
        }
      )
      
      // Get namespace statistics
      .get(
        "/stats",
        async ({ params: { namespace } }) => {
          const [totalResult, matchedResult] = await Promise.all([
            db.select({ count: count() })
              .from(items)
              .where(and(
                eq(items.namespace, namespace),
                isNull(items.deletedAt)
              )),
            db.select({ count: count() })
              .from(items)
              .where(and(
                eq(items.namespace, namespace),
                isNull(items.deletedAt),
                isNull(items.requestor)
              ))
          ]);

          const total = totalResult[0]!.count;
          const available = matchedResult[0]!.count;
          const matched = total - available;

          return {
            total,
            matched,
            available
          };
        },
        {
          response: t.Object({
            total: t.Number(),
            matched: t.Number(),
            available: t.Number()
          })
        }
      )
      
      // Batch add/remove items
      .patch(
        "/items",
        async ({ params: { namespace }, body: { add, remove } }) => {
          const results = [];

          if (add && add.length > 0) {
            const itemsToAdd = add.map(item => ({
              namespace,
              item,
              requestor: null,
              matchedAt: null,
            }));

            await db.insert(items).values(itemsToAdd);
            results.push(`Added ${add.length} items`);
          }

          if (remove && remove.length > 0) {
            await db.update(items)
              .set({ 
                deletedAt: new Date().toISOString() 
              })
              .where(and(
                eq(items.namespace, namespace),
                inArray(items.item, remove),
                isNull(items.deletedAt)
              ));
            results.push(`Removed ${remove.length} items`);
          }

          return {
            success: true,
            message: results.join(", ") || "No changes made"
          };
        },
        {
          body: t.Object({
            add: t.Optional(t.Array(t.String())),
            remove: t.Optional(t.Array(t.String()))
          }),
          response: t.Object({
            success: t.Boolean(),
            message: t.String()
          })
        }
      )
      
      // Synchronize items in namespace
      .put(
        "/items",
        async ({ params: { namespace }, body: { items: itemsToSync } }) => {
          // Get all existing items in the namespace
          const existingItems = await db.select()
            .from(items)
            .where(and(
              eq(items.namespace, namespace),
              isNull(items.deletedAt)
            ));

          const existingItemNames = existingItems.map(item => item.item);
          const itemsToAdd = itemsToSync.filter(item => !existingItemNames.includes(item));
          const itemsToRemove = existingItemNames.filter(item => !itemsToSync.includes(item));

          const results = [];

          if (itemsToAdd.length > 0) {
            const itemsToInsert = itemsToAdd.map(item => ({
              namespace,
              item,
              requestor: null,
              matchedAt: null,
            }));

            await db.insert(items).values(itemsToInsert);
            results.push(`Added ${itemsToAdd.length} items`);
          }

          if (itemsToRemove.length > 0) {
            await db.update(items)
              .set({ 
                deletedAt: new Date().toISOString() 
              })
              .where(and(
                eq(items.namespace, namespace),
                inArray(items.item, itemsToRemove),
                isNull(items.deletedAt)
              ));
            results.push(`Removed ${itemsToRemove.length} items`);
          }

          return {
            success: true,
            message: results.join(", ") || "No changes made"
          };
        },
        {
          body: t.Object({
            items: t.Array(t.String())
          }),
          response: t.Object({
            success: t.Boolean(),
            message: t.String()
          })
        }
      )
  )

  // Admin endpoints for API key management
  .group("/admin", (app) =>
    app
      .use(masterAuth)
      .post(
        "/api-keys",
        async ({ body: { apiKey, namespace } }) => {
          try {
            await db.insert(apiKeys).values({
              apiKey,
              namespace,
            });

            return {
              success: true,
              message: "API key created successfully"
            };
          } catch (error) {
            return {
              success: false,
              message: "API key already exists"
            };
          }
        },
        {
          body: t.Object({
            apiKey: t.String(),
            namespace: t.String()
          }),
          response: t.Object({
            success: t.Boolean(),
            message: t.String()
          })
        }
      )
      
      .delete(
        "/api-keys/:apiKey",
        async ({ params: { apiKey } }) => {
          await db.update(apiKeys)
            .set({ 
              deletedAt: new Date().toISOString() 
            })
            .where(and(
              eq(apiKeys.apiKey, apiKey),
              isNull(apiKeys.deletedAt)
            ));

          return {
            success: true,
            message: "API key deleted successfully"
          };
        },
        {
          response: t.Object({
            success: t.Boolean(),
            message: t.String()
          })
        }
      )
      
      .get(
        "/api-keys",
        async () => {
          const results = await db.select()
            .from(apiKeys)
            .where(isNull(apiKeys.deletedAt))
            .orderBy(apiKeys.createdAt);

          return {
            apiKeys: results.map(key => ({
              apiKey: key.apiKey,
              namespace: key.namespace,
              createdAt: key.createdAt
            }))
          };
        },
        {
          response: t.Object({
            apiKeys: t.Array(t.Object({
              apiKey: t.String(),
              namespace: t.String(),
              createdAt: t.String()
            }))
          })
        }
      )
  );

export default app;
