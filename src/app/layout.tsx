// src/app/layout.tsx

export const metadata = {
  title: "Bling Callback",
  description: "Integração com Bling ERP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
