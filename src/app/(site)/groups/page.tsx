import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { JoinGroupForm } from "@/components/groups/join-group-form";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsHome() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
            Bring your crew
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Start a private group, share the invite, and watch the leaderboard
            sort itself out as the games roll in.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-ink-600/40 p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Create a group</h2>
            <Suspense fallback={null}>
              <CreateGroupForm />
            </Suspense>
          </section>
          <section className="rounded-3xl border border-white/10 bg-ink-600/40 p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Join with a code</h2>
            <p className="mb-4 text-sm text-muted">
              Enter a friend&apos;s invite code. If you&apos;ve already predicted at
              the group&apos;s level, you can join in one tap.
            </p>
            <JoinGroupForm />
          </section>
        </div>

        <p className="mt-8 text-center text-sm text-faint">
          Already in some groups?{" "}
          <Link href="/me" className="text-lime hover:underline">
            See them in My stuff →
          </Link>
        </p>
    </main>
  );
}
