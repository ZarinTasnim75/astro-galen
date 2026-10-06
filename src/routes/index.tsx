import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "AstroGalen — Your health. Your mission. Always monitored." },
      { name: "description", content: "Astronaut health monitoring and decision support for long-duration missions." },
      { property: "og:title", content: "AstroGalen" },
      { property: "og:description", content: "Your health. Your mission. Always monitored." },
    ],
  }),
});
