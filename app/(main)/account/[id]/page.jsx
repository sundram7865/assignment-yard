// app/account/[id]/page.jsx or page.tsx

import { getAccountWithTransactions } from "@/actions/account";
import { TransactionTable } from "../_components/transaction-table";
import { AccountChart } from "../_components/account-chart";
import { notFound } from "next/navigation";
import React from "react";

// Helper: Safely serialize a transaction for client components
function serializeTransaction(tx) {
  return {
    id: tx._id?.toString?.() ?? tx.id ?? "",
    accountId: tx.accountId?.toString?.() ?? "",
    type: tx.type,
    amount: parseFloat(tx.amount?.toString?.() ?? "0"),
    description: tx.description || "",
    category: tx.category || "",
    isRecurring: !!tx.isRecurring,
    status: tx.status || "",
    date:
      tx.date instanceof Date ? tx.date.toISOString() : tx.date,
    nextRecurringDate:
      tx.nextRecurringDate instanceof Date
        ? tx.nextRecurringDate.toISOString()
        : tx.nextRecurringDate,
    createdAt:
      tx.createdAt instanceof Date
        ? tx.createdAt.toISOString()
        : tx.createdAt,
    updatedAt:
      tx.updatedAt instanceof Date
        ? tx.updatedAt.toISOString()
        : tx.updatedAt,
  };
}

// Helper: Safely serialize the account
function serializeAccount(acc) {
  return {
    id: acc._id?.toString?.() ?? acc.id ?? "",
    name: acc.name || "",
    type: acc.type || "OTHER",
    balance: parseFloat(acc.balance?.toString?.() ?? "0"),
    createdAt:
      acc.createdAt instanceof Date
        ? acc.createdAt.toISOString()
        : acc.createdAt,
    updatedAt:
      acc.updatedAt instanceof Date
        ? acc.updatedAt.toISOString()
        : acc.updatedAt,
    _count: {
      transactions: acc._count?.transactions || 0,
    },
  };
}

export default async function AccountPage({ params }) {
  const accountId = params.id;

  if (!accountId) {
    notFound();
  }

  const accountData = await getAccountWithTransactions(accountId);
  if (!accountData) {
    notFound();
  }

  const { transactions: rawTransactions, ...rawAccount } = accountData;

  const transactions = rawTransactions.map(serializeTransaction);
  const account = serializeAccount(rawAccount);

  return (
    <div className="space-y-8 px-5">
      <div className="flex gap-4 items-end justify-between">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight gradient-title capitalize">
            {account.name}
          </h1>
          <p className="text-muted-foreground">
            {account.type.charAt(0).toUpperCase() + account.type.slice(1).toLowerCase()} Account
          </p>
        </div>
        <div className="text-right pb-2">
          <div className="text-xl sm:text-2xl font-bold">
            ${account.balance.toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground">
            {account._count.transactions} Transactions
          </p>
        </div>
      </div>

      <AccountChart transactions={transactions} />
      <TransactionTable transactions={transactions} />
    </div>
  );
}
