import "./globals.css";

export const metadata = {
  title: "Momentum | Cognitive Translation Layer",
  description: "Translate verbal chaos into structured execution. Stop overthinking. Take one step.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      
      <body className="bg-zinc-950 text-zinc-50 antialiased">
        {children}
      </body>
    </html>
  );
}