import "./globals.css";

export const metadata = {
  title: "Water Fold Effect",
  description: "Three.js portfolio scene",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
