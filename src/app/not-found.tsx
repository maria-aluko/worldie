import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <div className="font-display text-8xl font-extrabold text-gradient">404</div>
        <h1 className="mt-4 font-display text-2xl font-bold">Off the pitch</h1>
        <p className="mt-2 text-muted">
          This page doesn&apos;t exist — or the prediction was never made.
        </p>
        <div className="mt-8 flex gap-3">
          <Button href="/">Home</Button>
          <Button href="/predict" variant="outline">
            Make a prediction
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
