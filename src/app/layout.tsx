import "../index.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";

export const metadata = {
  title: "Maker",
  description: "Draw NxN pixel graphics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>{children}</body>
      <Toaster />
    </html>
  );
}
