import { getAccountWithTransactions } from "@/actions/account";
import { TransactionTable } from "../_components/transaction-table";
import { notFound } from "next/navigation";
import { AccountChart } from "../_components/account-chart";

export default async function AccountPage({ params }) {
  const accountData = await getAccountWithTransactions(params.id);

  if (!accountData) {
    notFound(); // gracefully 404 if not found
  }

  const { transactions, ...account } = accountData;

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
      <AccountChart transactions={transactions || []} />

      {/* Table */}
      <TransactionTable transactions={transactions || []} />
    </div>
  );
}
