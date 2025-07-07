"use server";

import { connectDB } from "@/lib/db";
import { Transaction, Account } from "@/models/models";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

// ✅ Decimal Conversion Helper
const toDecimal128 = (value) =>
  mongoose.Types.Decimal128.fromString(parseFloat(value).toString());

// ✅ Number Conversion from Decimal128
const toNumber = (decimal) => parseFloat(decimal?.toString() || "0");

// ✅ Manual Serializer to prevent Client Component errors
function serializeTransaction(tx) {
  const plain = tx.toObject ? tx.toObject() : tx;

  return {
    id: plain._id?.toString() || "",
    accountId: plain.accountId?.toString() || "",
    type: plain.type,
    amount: parseFloat(plain.amount?.toString() || "0"),
    description: plain.description || "",
    category: plain.category || "",
    isRecurring: !!plain.isRecurring,
    recurringInterval: plain.recurringInterval || "",
    status: plain.status || "",
    date:
      plain.date instanceof Date
        ? plain.date.toISOString()
        : new Date(plain.date).toISOString(),
    nextRecurringDate: plain.nextRecurringDate
      ? new Date(plain.nextRecurringDate).toISOString()
      : null,
    createdAt: plain.createdAt?.toISOString?.() || "",
    updatedAt: plain.updatedAt?.toISOString?.() || "",
  };
}

// ✅ Create Transaction
export async function createTransaction(data) {
  await connectDB();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const amount = toDecimal128(data.amount);
    const account = await Account.findById(data.accountId).session(session);
    if (!account) throw new Error("Account not found");

    const balanceChange =
      data.type === "EXPENSE" ? -parseFloat(data.amount) : parseFloat(data.amount);

    const newTransaction = await Transaction.create(
      [
        {
          ...data,
          amount,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      ],
      { session }
    );

    // Update account balance
    const newBalance = toNumber(account.balance) + balanceChange;
    account.balance = toDecimal128(newBalance);
    await account.save({ session });

    await session.commitTransaction();
    session.endSession();

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return {
      success: true,
      data: serializeTransaction(newTransaction[0]),
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transaction creation error:", error);
    return { success: false, message: error.message || "Something went wrong" };
  }
}

// ✅ Update Transaction
export async function updateTransaction(id, data) {
  await connectDB();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const amount = toDecimal128(data.amount);
    const original = await Transaction.findById(id).session(session);
    if (!original) throw new Error("Original transaction not found");

    const account = await Account.findById(data.accountId).session(session);
    if (!account) throw new Error("Account not found");

    const oldChange =
      original.type === "EXPENSE"
        ? -toNumber(original.amount)
        : toNumber(original.amount);

    const newChange =
      data.type === "EXPENSE"
        ? -parseFloat(data.amount)
        : parseFloat(data.amount);

    const netChange = newChange - oldChange;

    const updated = await Transaction.findByIdAndUpdate(
      id,
      {
        ...data,
        amount,
        nextRecurringDate:
          data.isRecurring && data.recurringInterval
            ? calculateNextRecurringDate(data.date, data.recurringInterval)
            : null,
      },
      { new: true, session }
    );

    const updatedBalance = toNumber(account.balance) + netChange;
    account.balance = toDecimal128(updatedBalance);
    await account.save({ session });

    await session.commitTransaction();
    session.endSession();

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return {
      success: true,
      data: serializeTransaction(updated),
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transaction update error:", error);
    return { success: false, message: error.message || "Update failed" };
  }
}

// ✅ Get Transaction by ID
export async function getTransaction(id) {
  await connectDB();
  try {
    const transaction = await Transaction.findById(id);
    if (!transaction) throw new Error("Transaction not found");
    return serializeTransaction(transaction);
  } catch (error) {
    console.error("Get transaction error:", error);
    return null;
  }
}

// ✅ Get All Transactions
export async function getUserTransactions(query = {}) {
  await connectDB();
  try {
    const transactions = await Transaction.find(query)
      .populate("account")
      .sort({ date: -1 });

    return {
      success: true,
      data: transactions.map(serializeTransaction),
    };
  } catch (error) {
    console.error("Get transactions error:", error);
    return { success: false, message: error.message };
  }
}

// ✅ Recurring Date Helper
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
