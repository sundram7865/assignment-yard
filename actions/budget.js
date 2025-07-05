"use server";

import mongoose from "mongoose";
import { Budget, Transaction } from "@/models";
import { revalidatePath } from "next/cache";

// Fetch current month's budget and expense total
export async function getCurrentBudget(accountId) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budget = await Budget.findOne(); // only one budget for single user

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
      budget,
      currentExpenses,
    };
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw new Error("Failed to get budget");
  }
}

// Update or create monthly budget
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
      data: updated,
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return {
      success: false,
      error: error.message || "Failed to update budget",
    };
  }
}
