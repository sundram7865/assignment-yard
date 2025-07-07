import { getAccountWithTransactions } from "@/actions/account";
import { TransactionTable } from "../_components/transaction-table";
import { notFound } from "next/navigation";
import { AccountChart } from "../_components/account-chart";

// Helper to serialize Mongoose Transaction and Account data
function serializeTransaction(tx) {
  return {
    ...tx,
    id: tx._id?.toString?.() ?? tx.id ?? "",
    accountId: tx.accountId?.toString?.() ?? "",
    amount: parseFloat(tx.amount?.toString?.() ?? "0"),
    date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
    nextRecurringDate: tx.nextRecurringDate instanceof Date
      ? tx.nextRecurringDate.toISOString()
      : tx.nextRecurringDate,
    createdAt: tx.createdAt instanceof Date
      ? tx.createdAt.toISOString()
      : tx.createdAt,
    updatedAt: tx.updatedAt instanceof Date
      ? tx.updatedAt.toISOString()
      : tx.updatedAt,
  };
}

function serializeAccount(account) {
  return {
    ...account,
    id: account._id?.toString?.() ?? account.id ?? "",
    balance: parseFloat(account.balance?.toString?.() ?? "0"),
    createdAt:
      account.createdAt instanceof Date
        ? account.createdAt.toISOString()
        : account.createdAt,
    updatedAt:
      account.updatedAt instanceof Date
        ? account.updatedAt.toISOString()
        : account.updatedAt,
  };
}

export default async function AccountPage({ params }) {
  const accountData = await getAccountWithTransactions(params.id);

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
            {(account.type || "Other").charAt(0).toUpperCase() +
              (account.type || "Other").slice(1).toLowerCase()}{" "}
            Account
          </p>
        </div>

        <div className="text-right pb-2">
          <div className="text-xl sm:text-2xl font-bold">
            ${parseFloat(account?.balance || 0).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground">
            {account?._count?.transactions || 0} Transactions
          </p>
        </div>
      </div>

      {/* Chart */}
      <AccountChart transactions={transactions} />

      {/* Table */}
      <TransactionTable transactions={transactions} />
    </div>
  );
}
