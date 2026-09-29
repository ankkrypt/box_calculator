import "./globals.css";

export const metadata = {
  title: "BxCalc – Corrugated box calculator",
  description: "Corrugated box calculator: order details, board build, quotation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
