import { Buffer } from "node:buffer";

globalThis.Buffer ??= Buffer;

process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "test-access-secret";
process.env.JWT_REFRESH ??= "test-refresh-secret";
process.env.ORIGIN_FRONT ??= "http://localhost:5173";
process.env.ORIGIN_BACK ??= "http://localhost:5000";
process.env.ORIGIN_CRETEVALLEY ??= "http://localhost:4173";
process.env.ORIGIN_SULEIMAN ??= "http://localhost:4174";
