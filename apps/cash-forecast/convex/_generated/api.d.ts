/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as billing from "../billing.js";
import type * as http from "../http.js";
import type * as pdfImports from "../pdfImports.js";
import type * as reconcile from "../reconcile.js";
import type * as rules from "../rules.js";
import type * as settings from "../settings.js";
import type * as transactions from "../transactions.js";
import type * as validate from "../validate.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  billing: typeof billing;
  http: typeof http;
  pdfImports: typeof pdfImports;
  reconcile: typeof reconcile;
  rules: typeof rules;
  settings: typeof settings;
  transactions: typeof transactions;
  validate: typeof validate;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
