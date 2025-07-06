"use server";

import { connectDB } from "@/lib/db";
import { Account, Transaction } from "@/models/models";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

// ---------- Serialize helper ----------
const serialize = (obj) => {
  const serialized = obj.toObject();
  serialized.id = serialized._id.toString();
  if (serialized.balance instanceof mongoose.Types.Decimal128) {
    serialized.balance = parseFloat(serialized.balance.toString());
  }
  if (serialized.amount instanceof mongoose.Types.Decimal128) {
    serialized.amount = parseFloat(serialized.amount.toString());
  }
  return serialized;
};

// -------- Get account with its transactions --------
export async function getAccountWithTransactions(accountId) {
  try {
    await connectDB();

    const account = await Account.findById(accountId).lean();
    if (!account) return null;

    const transactions = await Transaction.find({ accountId })
      .sort({ date: -1 })
      .lean();

    const txCount = await Transaction.countDocuments({ accountId });

    return {
      ...serialize(account),
      transactions: transactions.map(serialize),
      _count: {
        transactions: txCount,
      },
    };
  } catch (error) {
    console.error("Error fetching account:", error);
    throw new Error("Failed to fetch account");
  }
}

// -------- Bulk delete transactions --------
export async function bulkDeleteTransactions(transactionIds) {
  try {
    await connectDB();

    const transactions = await Transaction.find({
      _id: { $in: transactionIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    const accountBalanceChanges = transactions.reduce((acc, tx) => {
      const change = tx.type === "EXPENSE" ? tx.amount : -tx.amount;
      const accountId = tx.accountId.toString();
      acc[accountId] = (acc[accountId] || 0) + parseFloat(change.toString());
      return acc;
    }, {});

    // Delete transactions
    await Transaction.deleteMany({
      _id: { $in: transactionIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    // Update balances
    await Promise.all(
      Object.entries(accountBalanceChanges).map(([accountId, change]) => {
        return Account.findByIdAndUpdate(accountId, {
          $inc: { balance: change },
        });
      })
    );

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
    await connectDB();

    await Account.updateMany(
      { isDefault: true },
      { $set: { isDefault: false } }
    );

    const updated = await Account.findByIdAndUpdate(
      accountId,
      { isDefault: true },
      { new: true }
    );

    revalidatePath("/dashboard");

    return { success: true, data: serialize(updated) };
  } catch (error) {
    console.error("Error updating default account:", error);
    return { success: false, error: error.message };
  }
}
