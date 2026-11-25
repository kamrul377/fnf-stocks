import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";

export const metadata = { title: "FnF Stocks" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><AuthProvider><AppShell>{children}</AppShell></AuthProvider></body>
    </html>
  );
}
