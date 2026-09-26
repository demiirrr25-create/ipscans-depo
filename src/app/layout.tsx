// The real layout (html/body) lives in src/app/[locale]/layout.tsx.
// This root layout is a required pass-through for the App Router.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
