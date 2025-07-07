import { getAccounts, getDashboardData } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { AccountCard } from "./_components/account-card";
import { BudgetProgress } from "./_components/budget-progress";
import { DashboardOverview } from "./_components/transaction-overview";
import { CreateAccountDrawer } from "@/components/create-account-drawer";

import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

// ---- Helper to serialize Mongoose budget object ----
const serializeBudget = (budget) => {
  if (!budget) return null;

  const { _id, amount } = budget;
  return {
    id: _id?.toString?.() ?? "",
    amount: parseFloat(amount?.toString?.() ?? "0"),
  };
};

// ---- Helper to serialize each transaction safely ----
const serializeTransaction = (tx) => {
  return {
    id: tx._id?.toString?.() ?? tx.id ?? "",
    accountId:
      typeof tx.accountId === "object" && typeof tx.accountId.toString === "function"
        ? tx.accountId.toString()
        : String(tx.accountId ?? ""),
    type: tx.type || "EXPENSE",
    amount: parseFloat(tx.amount?.toString?.() ?? "0"),
    description: tx.description || "",
    category: tx.category || "",
    isRecurring: !!tx.isRecurring,
    status: tx.status || "",
    date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
    nextRecurringDate:
      tx.nextRecurringDate instanceof Date
        ? tx.nextRecurringDate.toISOString()
        : tx.nextRecurringDate,
    createdAt:
      tx.createdAt instanceof Date ? tx.createdAt.toISOString() : tx.createdAt,
    updatedAt:
      tx.updatedAt instanceof Date ? tx.updatedAt.toISOString() : tx.updatedAt,
  };
};


export default async function DashboardPage() {
  const [accounts, transactions] = await Promise.all([
    getAccounts(),
    getDashboardData(),
  ]);

  const defaultAccount = accounts.find((acc) => acc.isDefault);

  let budgetData = null;

  if (defaultAccount) {
    const rawBudgetData = await getCurrentBudget(defaultAccount.id);
    budgetData = {
      budget: serializeBudget(rawBudgetData?.budget),
      currentExpenses: parseFloat(rawBudgetData?.currentExpenses || 0),
    };
  }

  return (
    <div className="space-y-8">
      {/* Budget Progress */}
      <BudgetProgress
        initialBudget={budgetData?.budget || null}
        currentExpenses={budgetData?.currentExpenses || 0}
      />

      {/* Transaction Overview */}
      <DashboardOverview
        accounts={accounts}
        transactions={transactions.map(serializeTransaction)}
      />

      {/* Account Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Add Account Button */}
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>

        {/* Existing Accounts */}
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
