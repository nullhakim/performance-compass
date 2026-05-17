import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { login, isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
});

function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Small artificial delay to feel more natural
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (login(username, password)) {
        toast.success("Login successful");
        router.navigate({ to: "/" });
      } else {
        toast.error("Invalid username or password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="space-y-2 pb-6">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
              <img src="/logo-icon.png" alt="Bank Galuh Logo" className="w-10 h-10 object-contain" onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<span class="text-xl font-bold text-primary">BG</span>';
              }} />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold tracking-tight">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the internal system
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
          </CardContent>
          <CardFooter className="pt-2 pb-6">
            <Button className="w-full h-11 text-base" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
