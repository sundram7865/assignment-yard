import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BudgetIQ",
  description: "personal budget tracker ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className}`}
      >
    
        {children}
        {/*footer*/}
         <footer className="bg-blue-50 text-gray-700 py-10">
  <div className="max-w-6xl mx-auto px-4 text-center">
    <h2 className="text-2xl font-bold text-blue-600 mb-2">BudgetIQ</h2>
    <p className="text-sm">Made with 💗 by Sundram Mishra</p>
    <div className="mt-6 border-t border-gray-200 pt-4 text-xs text-gray-500">
      © {new Date().getFullYear()} BudgetIQ. All rights reserved.
    </div>
  </div>
</footer>


      </body>
    </html>
  );
}
