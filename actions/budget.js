"use server";

import mongoose from "mongoose";
import { Budget, Transaction } from "@/models/models";
import { revalidatePath } from "next/cache";

// Helper to serialize a Mongoose document
const serialize = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject();
  obj._id = obj._id.toString();
  if (obj.amount?.toString) obj.amount = parseFloat(obj.amount.toString());
  if (obj.createdAt) obj.createdAt = obj.createdAt.toISOString();
  if (obj.updatedAt) obj.updatedAt = obj.updatedAt.toISOString();
  return obj;
};

// -------- Get current month's budget and total expenses --------
export async function getCurrentBudget(accountId) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budgetDoc = await Budget.findOne(); // single-user mode

    const expensesAgg = await Transaction.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(accountId),
          type: "EXPENSE",
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const currentExpenses = expensesAgg[0]?.total || 0;

    return {
      budget: serialize(budgetDoc),
      currentExpenses,
    };
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw new Error("Failed to get budget");
  }
}

// -------- Update or create budget --------
export async function updateBudget(amount) {
  try {
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error("Invalid budget amount");
    }

    const updated = await Budget.findOneAndUpdate(
      {},
      { amount },
      { upsert: true, new: true }
    );

    revalidatePath("/dashboard");

    return {
      success: true,
      data: serialize(updated),
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return {
      success: false,
      error: error.message || "Failed to update budget",
    };
  }
}
