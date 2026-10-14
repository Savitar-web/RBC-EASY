import { createFileRoute } from "@tanstack/react-router";
import { Calculadora } from "@/components/calculadora";

export const Route = createFileRoute("/")({
  component: Calculadora,
});
