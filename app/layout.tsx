import "./globals.css";

export const metadata = {
  title: "証明写真ジェネレーター",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}