"use server";

import { connectDB } from "@/lib/db";
import { Transaction, Account } from "@/models/models";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

// Create Transaction
export async function createTransaction(data) {
  await connectDB();

  const account = await Account.findById(data.accountId);
  if (!account) throw new Error("Account not found");

  const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const newTransaction = await Transaction.create(
      [
        {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      ],
      { session }
    );

    account.balance += balanceChange;
    await account.save({ session });

    await session.commitTransaction();
    session.endSession();

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: newTransaction[0] };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return { success: false, message: error.message };
  }
}

// Get Transaction by ID
export async function getTransaction(id) {
  await connectDB();
  const transaction = await Transaction.findById(id);
  if (!transaction) throw new Error("Transaction not found");
  return transaction;
}

// Update Transaction
export async function updateTransaction(id, data) {
  await connectDB();

  const original = await Transaction.findById(id);
  if (!original) throw new Error("Transaction not found");

  const account = await Account.findById(data.accountId);
  if (!account) throw new Error("Account not found");

  const oldChange =
    original.type === "EXPENSE" ? -original.amount : original.amount;
  const newChange = data.type === "EXPENSE" ? -data.amount : data.amount;
  const netChange = newChange - oldChange;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const updated = await Transaction.findByIdAndUpdate(
      id,
      {
        ...data,
        nextRecurringDate:
          data.isRecurring && data.recurringInterval
            ? calculateNextRecurringDate(data.date, data.recurringInterval)
            : null,
      },
      { new: true, session }
    );

    account.balance += netChange;
    await account.save({ session });

    await session.commitTransaction();
    session.endSession();

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: updated };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return { success: false, message: error.message };
  }
}

// Get All Transactions (optional filters like userId, accountId)
export async function getUserTransactions(query = {}) {
  await connectDB();
  const transactions = await Transaction.find(query)
    .populate("account")
    .sort({ date: -1 });

  return { success: true, data: transactions };
}

// Helper: Calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);
  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}
