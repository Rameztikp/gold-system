import { z } from 'zod';

const int = z.number().int();
const nonNeg = int.min(0).max(1_000_000_000_00);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

export const lineValuesSchema = z.object({
  kind: z.enum(['sale', 'purchase', 'expense']),
  description: z.string().trim().max(200),
  pieces: int.min(0).max(100_000),
  weightCg: nonNeg,
  amountFils: nonNeg,
  wagesFils: nonNeg,
  commissionFils: nonNeg,
  extraFils: nonNeg,
});
export type LineInput = z.infer<typeof lineValuesSchema>;

export const createLineSchema = lineValuesSchema.extend({ id: uuidSchema, dayId: z.string().min(1) });
export const updateLineSchema = lineValuesSchema.extend({ version: int });
export const cancelLineSchema = z.object({ reason: z.string().trim().min(2).max(300), version: int });
export const restoreLineSchema = z.object({ version: int });

export const createDaySchema = z.object({ date: dateSchema });
export const updateDayHeaderSchema = z.object({
  goldPriceFils: nonNeg.nullable(),
  note: z.string().max(500),
  version: int,
});

const ledgerValue = nonNeg.nullable();
export const ledgerSchema = z.object({
  salesFils: ledgerValue, salesCg: ledgerValue,
  purchasesFils: ledgerValue, purchasesCg: ledgerValue,
  expensesFils: ledgerValue, wagesFils: ledgerValue,
});
export const compareSchema = z.object({ ledger: ledgerSchema, confirmLedgerError: z.boolean(), version: int });

export const rangeSchema = z.object({ from: dateSchema, to: dateSchema });
export const dashboardQuerySchema = z.object({ period: z.enum(['day', 'week', 'month']), date: dateSchema });

export const passwordLoginSchema = z.object({ username: z.string().trim().min(1).max(60), password: z.string().min(1).max(200) });
export const recoveryLoginSchema = z.object({ username: z.string().trim().min(1).max(60), code: z.string().trim().min(4).max(40) });

export const setupSchema = z.object({
  token: z.string().min(16),
  ownerName: z.string().trim().min(2).max(60),
  username: z.string().trim().regex(/^[a-z0-9._-]{3,30}$/),
  branchName: z.string().trim().min(2).max(60),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(60),
  username: z.string().trim().regex(/^[a-z0-9._-]{3,30}$/),
  password: z.string().min(10).max(200),
});
export const userStatusSchema = z.object({ status: z.enum(['active', 'suspended']), version: int });
export const resetPasswordSchema = z.object({ password: z.string().min(10).max(200), version: int });

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  countryCode: z.string().trim().regex(/^\+?\d{1,4}$/),
  timezone: z.string().trim().min(3).max(60),
  weekStart: int.min(0).max(6),
  version: int,
});
