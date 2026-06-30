import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Lock, Mail } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";
import api from "@/utils/api";
import React from "react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type LoginFields = z.infer<typeof loginSchema>;

export function Login() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFields) => {
    setIsLoading(true);
    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: any;
      }>("/api/auth/login", data);

      login(response.accessToken, response.refreshToken, response.user);
      toast.success("Welcome back!", `Logged in as ${response.user.firstName}`);
      navigate("/");
    } catch (err: any) {
      toast.error("Authentication failed", err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background blobs for premium glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-violet-600/10 rounded-full blur-[80px]" />

      <Card className="w-full max-w-md bg-card/75 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 bg-primary flex items-center justify-center rounded-xl text-primary-foreground shadow-lg shadow-primary/20 mb-3">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">CAFECHAI Enterprise POS</CardTitle>
          <CardDescription>Enter your credentials to sign in to your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@enterprise.com"
                  className="pl-10"
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  error={errors.password?.message}
                  {...register("password")}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm mt-2" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground border-t pt-4">
            <p>Seeded Admin Credentials:</p>
            <p className="font-semibold text-foreground mt-1">admin@enterprise.com / enter your password</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
