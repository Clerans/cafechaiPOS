import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, Mail, Key } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";
import api from "@/utils/api";
import React from "react";

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(10, "Token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters long"),
});

type ResetFields = z.infer<typeof resetSchema>;

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetFields>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: searchParams.get("email") || "",
      token: searchParams.get("token") || "",
      newPassword: "",
    },
  });

  // Sync search param modifications if redirected dynamically
  React.useEffect(() => {
    const email = searchParams.get("email");
    const token = searchParams.get("token");
    if (email) setValue("email", email);
    if (token) setValue("token", token);
  }, [searchParams, setValue]);

  const onSubmit = async (data: ResetFields) => {
    setIsLoading(true);
    try {
      await api.post("/api/auth/reset-password", data);
      toast.success("Password reset completed!", "Please sign in with your new credentials.");
      navigate("/login");
    } catch (err: any) {
      toast.error("Password reset failed", err.message || "Invalid or expired token");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-violet-600/10 rounded-full blur-[80px]" />

      <Card className="w-full max-w-md bg-card/75 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 bg-primary flex items-center justify-center rounded-xl text-primary-foreground shadow-lg shadow-primary/20 mb-3">
            <Key className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>Enter the verification token and choose your new password</CardDescription>
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
              <Label htmlFor="token">Authorization Token</Label>
              <Input
                id="token"
                type="text"
                placeholder="Paste token here..."
                error={errors.token?.message}
                {...register("token")}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  error={errors.newPassword?.message}
                  {...register("newPassword")}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm mt-2" isLoading={isLoading}>
              Update Password
            </Button>
          </form>

          <div className="mt-6 flex justify-center items-center">
            <Link to="/login" className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
              <ArrowLeft className="h-4.5 w-4.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
