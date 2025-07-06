"use server";

import { revalidatePath } from "next/cache";
import { Account, Transaction } from "@/models/models";
import { connectDB } from "@/lib/db";

// ----------- Helper for safely serializing Mongoose docs -----------
function serializeDoc(doc) {
  if (!doc) return null;
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;

  if (obj.balance?.toString) obj.balance = parseFloat(obj.balance.toString());
  if (obj.amount?.toString) obj.amount = parseFloat(obj.amount.toString());
  if (obj.createdAt) obj.createdAt = obj.createdAt.toISOString();
  if (obj.updatedAt) obj.updatedAt = obj.updatedAt.toISOString();

  return obj;
}

// ----------- Get all accounts with transaction counts -----------
export async function getAccounts() {
  await connectDB();

  try {
    const accounts = await Account.find().sort({ createdAt: -1 });

    const accountsWithTxCount = await Promise.all(
      accounts.map(async (account) => {
        const txCount = await Transaction.countDocuments({ accountId: account._id });
        return {
          ...serializeDoc(account),
          _count: { transactions: txCount },
        };
      })
    );

    return accountsWithTxCount;
  } catch (error) {
    console.error(error.message);
    throw new Error("Failed to fetch accounts");
  }
}

// ----------- Create a new account -----------
export async function createAccount(data) {
  await connectDB();

  try {
    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) throw new Error("Invalid balance amount");

    const existingAccounts = await Account.find();
    const shouldBeDefault = existingAccounts.length === 0 || data.isDefault;

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

    return { success: true, data: serializeDoc(newAccount) };
  } catch (error) {
    console.error(error.message);
    throw new Error("Failed to create account");
  }
}

// ----------- Get dashboard transactions -----------
export async function getDashboardData() {
  await connectDB();

  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    return transactions.map(serializeDoc);
  } catch (error) {
    console.error(error.message);
    throw new Error("Failed to fetch dashboard data");
  }
}
