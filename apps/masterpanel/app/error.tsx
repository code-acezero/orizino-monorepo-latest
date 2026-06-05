"use client";
export default function ErrorPage({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <a href="/" className="mt-4 inline-block text-primary underline">Go home</a>
      </div>
    </div>
  );
}
