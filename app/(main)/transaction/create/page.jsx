import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "../_components/transaction-form";
import { getTransaction } from "@/actions/transaction";

export default async function AddTransactionPage({ searchParams }) {
  const accounts = await getUserAccounts();
  const editId = searchParams?.edit || null;

  let initialData = null;

  if (editId) {
    const transaction = await getTransaction(editId);
    if (transaction) {
      initialData = {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        accountId: transaction.accountId,
        category: transaction.category,
        date: transaction.date,
        isRecurring: transaction.isRecurring,
        recurringInterval: transaction.recurringInterval || null,
      };
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title">
          {editId ? "Edit Transaction" : "Add Transaction"}
        </h1>
      </div>

      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
}
