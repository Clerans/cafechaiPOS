import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";
import api from "@/utils/api";
import React from "react";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotFields = z.infer<typeof forgotSchema>;

export function ForgotPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [mockToken, setMockToken] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFields>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFields) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string; message: string }>("/api/auth/forgot-password", data);
      toast.success("Reset link generated!", "Check your console or copy the local token below.");
      setMockToken(response.token);
    } catch (err: any) {
      toast.error("Failed to generate reset link", err.message || "Something went wrong");
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
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password</CardTitle>
          <CardDescription>Enter your email to generate a password reset authorization token</CardDescription>
        </CardHeader>
        <CardContent>
          {!mockToken ? (
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

              <Button type="submit" className="w-full h-11 text-sm mt-2" isLoading={isLoading}>
                Generate Reset Token
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md break-all text-xs font-mono border">
                <span className="font-semibold text-primary block mb-1">Local Mock Token:</span>
                {mockToken}
              </div>
              <p className="text-xs text-muted-foreground">
                In a production environment, this token is sent via email. For direct demonstration, click the button below to proceed to the Reset screen.
              </p>
              <Button
                onClick={() => navigate(`/reset-password?email=${encodeURIComponent(mockToken ? jwtEmailExtract(mockToken) : '')}&token=${mockToken}`)}
                className="w-full"
              >
                Proceed to Reset Password
              </Button>
            </div>
          )}

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

// Simple helper to extract email payload from local JWT mock string for redirection ease
function jwtEmailExtract(token: string): string {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload).email || "";
  } catch {
    return "";
  }
}
