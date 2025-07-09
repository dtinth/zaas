import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { isNull, and } from "drizzle-orm";

export const items = sqliteTable("items", {
  id: integer().primaryKey({ autoIncrement: true }),
  namespace: text().notNull(),
  item: text().notNull(),
  requestor: text(),
  matchedAt: text("matched_at"),
  createdAt: text("created_at").notNull().default("datetime('now')"),
  deletedAt: text("deleted_at"),
}, (table) => [
  // Unique constraints
  uniqueIndex("items_namespace_item_unique").on(table.namespace, table.item).where(isNull(table.deletedAt)),
  uniqueIndex("items_namespace_requestor_unique").on(table.namespace, table.requestor).where(isNull(table.deletedAt)),
  
  // Performance indices
  index("items_namespace_requestor_idx").on(table.namespace, table.requestor).where(isNull(table.deletedAt)),
  index("items_namespace_available_idx").on(table.namespace).where(and(isNull(table.requestor), isNull(table.deletedAt))!),
  index("items_namespace_created_idx").on(table.namespace, table.createdAt).where(isNull(table.deletedAt)),
]);

export const apiKeys = sqliteTable("api_keys", {
  id: integer().primaryKey({ autoIncrement: true }),
  apiKey: text("api_key").notNull(),
  namespace: text().notNull(),
  createdAt: text("created_at").notNull().default("datetime('now')"),
  deletedAt: text("deleted_at"),
}, (table) => [
  // Unique constraint
  uniqueIndex("api_keys_namespace_key_unique").on(table.namespace, table.apiKey).where(isNull(table.deletedAt)),
  
  // Performance indices
  index("api_keys_key_idx").on(table.apiKey).where(isNull(table.deletedAt)),
  index("api_keys_created_idx").on(table.createdAt).where(isNull(table.deletedAt)),
]);