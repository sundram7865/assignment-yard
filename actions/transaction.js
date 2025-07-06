"use server";

import { connectDB } from "@/lib/db";
import { Transaction, Account, User } from "@/models/models";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

// Create Transaction
export async function createTransaction(data) {
  await connectDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new Error("User not found");

  const account = await Account.findOne({ _id: data.accountId, userId: user._id });
  if (!account) throw new Error("Account not found");

  const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const newTransaction = await Transaction.create([{ 
      ...data,
      userId: user._id,
      nextRecurringDate:
        data.isRecurring && data.recurringInterval
          ? calculateNextRecurringDate(data.date, data.recurringInterval)
          : null,
    }], { session });

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
    throw new Error(error.message);
  }
}

// Get Transaction by ID
export async function getTransaction(id) {
  await connectDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new Error("User not found");

  const transaction = await Transaction.findOne({ _id: id, userId: user._id });
  if (!transaction) throw new Error("Transaction not found");

  return transaction;
}

// Update Transaction
export async function updateTransaction(id, data) {
  await connectDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new Error("User not found");

  const original = await Transaction.findOne({ _id: id, userId: user._id });
  if (!original) throw new Error("Transaction not found");

  const account = await Account.findOne({ _id: data.accountId });
  if (!account) throw new Error("Account not found");

  const oldChange = original.type === "EXPENSE" ? -original.amount : original.amount;
  const newChange = data.type === "EXPENSE" ? -data.amount : data.amount;
  const netChange = newChange - oldChange;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId: user._id },
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
    throw new Error(error.message);
  }
}

// Get All Transactions
export async function getUserTransactions(query = {}) {
  await connectDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new Error("User not found");

  const transactions = await Transaction.find({ userId: user._id, ...query })
    .populate("account")
    .sort({ date: -1 });

  return { success: true, data: transactions };
}

function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);
  switch (interval) {
    case "DAILY": date.setDate(date.getDate() + 1); break;
    case "WEEKLY": date.setDate(date.getDate() + 7); break;
    case "MONTHLY": date.setMonth(date.getMonth() + 1); break;
    case "YEARLY": date.setFullYear(date.getFullYear() + 1); break;
  }
  return date;
}
