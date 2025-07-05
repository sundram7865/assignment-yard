"use server";

import { revalidatePath } from "next/cache";
import { Account, Transaction } from "@/models/models"; // your mongoose models
import { connectToDB } from "@/lib/db"; // a utility function to connect if needed

const serializeTransaction = (obj) => {
  const serialized = { ...obj._doc };
  if (obj.balance) {
    serialized.balance = parseFloat(obj.balance.toString());
  }
  if (obj.amount) {
    serialized.amount = parseFloat(obj.amount.toString());
  }
  serialized.id = obj._id.toString();
  return serialized;
};

// Get all accounts (single-user mode)
export async function getUserAccounts() {
  await connectToDB();

  try {
    const accounts = await Account.find().sort({ createdAt: -1 });
    const accountsWithTransactionCount = await Promise.all(
      accounts.map(async (account) => {
        const txCount = await Transaction.countDocuments({ accountId: account._id });
        return {
          ...serializeTransaction(account),
          _count: {
            transactions: txCount,
          },
        };
      })
    );

    return accountsWithTransactionCount;
  } catch (error) {
    console.error(error.message);
    throw new Error("Failed to fetch accounts");
  }
}

// Create a new account
export async function createAccount(data) {
  await connectToDB();

  try {
    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance amount");
    }

    const existingAccounts = await Account.find();

    const shouldBeDefault = existingAccounts.length === 0 ? true : data.isDefault;

    if (shouldBeDefault) {
      await Account.updateMany({ isDefault: true }, { isDefault: false });
    }

    const newAccount = await Account.create({
      name: data.name,
      type: data.type,
      balance: balanceFloat,
      isDefault: shouldBeDefault,
    });

    revalidatePath("/dashboard");

    return { success: true, data: serializeTransaction(newAccount) };
  } catch (error) {
    console.error(error.message);
    throw new Error("Failed to create account");
  }
}

// Fetch all transactions for dashboard
export async function getDashboardData() {
  await connectToDB();

  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    return transactions.map(serializeTransaction);
  } catch (error) {
    console.error(error.message);
    throw new Error("Failed to fetch dashboard data");
  }
}
