export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-secondary/60 to-background p-4 sm:p-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  )
}
