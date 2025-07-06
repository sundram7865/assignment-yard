"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const serializeDecimal = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

// -------- Get account with its transactions --------
export async function getAccountWithTransactions(accountId) {
  try {
    const account = await db.account.findUnique({
      where: { id: accountId },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) return null;

    return {
      ...serializeDecimal(account),
      transactions: account.transactions.map(serializeDecimal),
    };
  } catch (error) {
    console.error("Error fetching account:", error);
    throw new Error("Failed to fetch account");
  }
}

// -------- Bulk delete transactions --------
export async function bulkDeleteTransactions(transactionIds) {
  try {
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
      },
    });

    // Group by accountId to calculate balance change
    const accountBalanceChanges = transactions.reduce((acc, tx) => {
      const change = tx.type === "EXPENSE" ? tx.amount : -tx.amount;
      acc[tx.accountId] = (acc[tx.accountId] || 0) + change;
      return acc;
    }, {});

    // Run DB transaction
    await db.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
        },
      });

      for (const [accountId, balanceChange] of Object.entries(accountBalanceChanges)) {
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");

    return { success: true };
  } catch (error) {
    console.error("Error deleting transactions:", error);
    return { success: false, error: error.message };
  }
}

// -------- Update default account (only one default allowed) --------
export async function updateDefaultAccount(accountId) {
  try {
    await db.account.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    const updated = await db.account.update({
      where: { id: accountId },
      data: { isDefault: true },
    });

    revalidatePath("/dashboard");

    return { success: true, data: serializeDecimal(updated) };
  } catch (error) {
    console.error("Error updating default account:", error);
    return { success: false, error: error.message };
  }
}
