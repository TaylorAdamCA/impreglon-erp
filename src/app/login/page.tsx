import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Impreglon Canada"
            width={200}
            height={40}
            priority
          />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Login page will be built in Issue #4.
        </p>
      </div>
    </div>
  );
}
