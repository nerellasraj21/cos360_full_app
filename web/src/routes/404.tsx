import React from "react";
import { cn } from "@/lib/utils";

export default function FourOhFour() {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen bg-background text-foreground")}> 
      <h1 className={cn("text-6xl font-bold mb-4")}>404</h1>
      <p className={cn("text-xl mb-8")}>This page does not exist.</p>
      <a href="/" className={cn("text-primary underline text-lg")}>Return Home</a>
    </div>
  );
} 