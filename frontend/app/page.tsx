import type { JSX } from "react";
import EventFeed from "./components/EventFeed";
import Hero from "./components/Hero";

export default function Home(): JSX.Element {
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden pt-32">
      <Hero />
      <EventFeed />
    </main>
  );
}
