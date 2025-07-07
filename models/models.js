const mongoose = require("mongoose");
const { Schema } = mongoose;

// -------------------- ENUMS --------------------
const TransactionType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
};

const AccountType = {
  CURRENT: "CURRENT",
  SAVINGS: "SAVINGS",
};

const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

const RecurringInterval = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
};

// -------------------- ACCOUNT SCHEMA --------------------
const AccountSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: Object.values(AccountType), required: true },
    balance: { type: "Decimal128", default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Account =
  mongoose.models.Account || mongoose.model("Account", AccountSchema);

// -------------------- TRANSACTION SCHEMA --------------------
const TransactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    amount: { type: "Decimal128", required: true },
    description: { type: String },
    date: { type: Date, required: true },
    category: { type: String },
    receiptUrl: { type: String },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: Object.values(RecurringInterval),
    },
    nextRecurringDate: { type: Date },
    lastProcessed: { type: Date },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.COMPLETED,
    },
    accountId: { type: Schema.Types.ObjectId, ref: "Account" },
  },
  { timestamps: true }
);

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);

// -------------------- BUDGET SCHEMA --------------------
const BudgetSchema = new Schema(
  {
    category: { type: String, required: true },
    amount: { type: "Decimal128", required: true },
  },
  { timestamps: true }
);

const Budget =
  mongoose.models.Budget || mongoose.model("Budget", BudgetSchema);

// -------------------- EXPORTS --------------------
module.exports = {
  Account,
  Transaction,
  Budget,
  TransactionType,
  AccountType,
  TransactionStatus,
  RecurringInterval,
};
