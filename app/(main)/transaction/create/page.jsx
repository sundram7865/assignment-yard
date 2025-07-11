import { getAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "../_components/transaction-form";
import { getTransaction } from "@/actions/transaction";

export const dynamic = "force-dynamic"; // Avoid caching for real-time updates

export default async function AddTransactionPage({ searchParams: rawSearchParams }) {
  const searchParams = await rawSearchParams; // ✅ FIXED: await is required
  const accounts = await getAccounts();

  const editId = searchParams?.edit;

  let initialData = null;

  if (typeof editId === "string") {
    const transaction = await getTransaction(editId);
    if (transaction) {
      initialData = {
        id: transaction._id?.toString?.() ?? "",
        type: transaction.type,
        amount: parseFloat(transaction.amount?.toString?.() ?? "0"), // ✅ serialized
        description: transaction.description || "",
        accountId: transaction.accountId?.toString?.() ?? "",         // ✅ serialized
        category: transaction.category || "",
        date:
          transaction.date instanceof Date
            ? transaction.date.toISOString()
            : transaction.date,
        isRecurring: !!transaction.isRecurring,
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
