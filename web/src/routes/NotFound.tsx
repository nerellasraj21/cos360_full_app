import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted")}> 
      <Card className={cn("w-full max-w-md shadow-2xl border-0 bg-white/90 dark:bg-background/80 backdrop-blur-lg")}> 
        <CardContent className={cn("flex flex-col items-center py-12")}> 
          <span className={cn("bg-destructive/10 rounded-full p-4 mb-6")}> 
            <AlertTriangle className={cn("w-16 h-16 text-destructive")} />
          </span>
          <h1 className={cn("text-6xl font-extrabold text-destructive mb-2 drop-shadow-lg")}>404</h1>
          <p className={cn("text-lg text-muted-foreground mb-8 text-center")}>Oops! The page you are looking for does not exist or has been moved.</p>
          <Button asChild size="lg" className={cn("px-8 py-2 text-lg font-semibold shadow-md")}> 
            <a href="/">Go Home</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 