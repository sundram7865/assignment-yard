"use server";

import { subDays } from "date-fns";
import { connectDB } from "@/lib/db"; // your custom Mongoose connector
import { Transaction, Account } from "@/models/models"; // your Mongoose models

const ACCOUNT_ID = "account-id"; // 🔁 Replace this with your actual MongoDB ObjectId string

const CATEGORIES = {
  INCOME: [
    { name: "salary", range: [5000, 8000] },
    { name: "freelance", range: [1000, 3000] },
    { name: "investments", range: [500, 2000] },
    { name: "other-income", range: [100, 1000] },
  ],
  EXPENSE: [
    { name: "housing", range: [1000, 2000] },
    { name: "transportation", range: [100, 500] },
    { name: "groceries", range: [200, 600] },
    { name: "utilities", range: [100, 300] },
    { name: "entertainment", range: [50, 200] },
    { name: "food", range: [50, 150] },
    { name: "shopping", range: [100, 500] },
    { name: "healthcare", range: [100, 1000] },
    { name: "education", range: [200, 1000] },
    { name: "travel", range: [500, 2000] },
  ],
};

function getRandomAmount(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function getRandomCategory(type) {
  const list = CATEGORIES[type];
  const item = list[Math.floor(Math.random() * list.length)];
  const amount = getRandomAmount(item.range[0], item.range[1]);
  return { category: item.name, amount };
}

export async function seedTransactions() {
  try {
    await connectDB();

    const account = await Account.findById(ACCOUNT_ID);
    if (!account) throw new Error("Account not found. Invalid ACCOUNT_ID.");

    const transactions = [];
    let newBalance = 0;

    for (let i = 90; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const count = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < count; j++) {
        const type = Math.random() < 0.4 ? "INCOME" : "EXPENSE";
        const { category, amount } = getRandomCategory(type);

        transactions.push({
          type,
          amount,
          category,
          description: `${type === "INCOME" ? "Received" : "Paid for"} ${category}`,
          date,
          accountId: account._id,
          status: "COMPLETED",
          createdAt: date,
          updatedAt: date,
        });

        newBalance += type === "INCOME" ? amount : -amount;
      }
    }

    // Clear old transactions & insert new ones
    await Transaction.deleteMany({ accountId: account._id });
    await Transaction.insertMany(transactions);

    // Update account balance
    account.balance = newBalance;
    await account.save();

    return {
      success: true,
      message: `Seeded ${transactions.length} transactions successfully.`,
    };
  } catch (err) {
    console.error("Seeding failed:", err);
    return {
      success: false,
      error: err.message || "Something went wrong during seeding.",
    };
  }
}
