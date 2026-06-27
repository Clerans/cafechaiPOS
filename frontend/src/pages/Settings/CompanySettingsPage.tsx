import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Save, Globe, DollarSign, Percent } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import api from "@/utils/api";

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  currency: z.string().min(1, "Currency code is required"),
  timezone: z.string().min(1, "Timezone is required"),
  language: z.string().min(1, "Language is required"),
  taxRate: z.coerce.number().min(0, "Tax rate cannot be negative").max(100, "Tax rate cannot exceed 100%"),
  receiptFooter: z.string().optional().or(z.literal("")),
});

type SettingsFields = z.infer<typeof settingsSchema>;

interface CompanySettings {
  id: number;
  companyName: string;
  logo: string | null;
  currency: string;
  timezone: string;
  language: string;
  taxRate: number;
  receiptFooter: string | null;
}

export function CompanySettingsPage() {
  const queryClient = useQueryClient();

  // Load existing settings
  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["settings"],
    queryFn: () => api.get<CompanySettings>("/api/settings"),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SettingsFields>({
    resolver: zodResolver(settingsSchema),
  });

  // Sync settings response values into React Hook Form
  React.useEffect(() => {
    if (settings) {
      setValue("companyName", settings.companyName);
      setValue("currency", settings.currency);
      setValue("timezone", settings.timezone);
      setValue("language", settings.language);
      setValue("taxRate", settings.taxRate);
      setValue("receiptFooter", settings.receiptFooter || "");
    }
  }, [settings, setValue]);

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: (data: SettingsFields) => api.put("/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated", "Company configurations saved successfully.");
    },
    onError: (err: any) => {
      toast.error("Failed to save settings", err.message);
    },
  });

  const onSubmit = (data: SettingsFields) => {
    updateSettingsMutation.mutate(data);
  };

  const currencyOptions = [
    { label: "USD ($) - US Dollar", value: "USD" },
    { label: "EUR (€) - Euro", value: "EUR" },
    { label: "GBP (£) - British Pound", value: "GBP" },
    { label: "CAD ($) - Canadian Dollar", value: "CAD" },
  ];

  const timezoneOptions = [
    { label: "UTC / GMT", value: "UTC" },
    { label: "US Eastern (EST/EDT)", value: "America/New_York" },
    { label: "US Central (CST/CDT)", value: "America/Chicago" },
    { label: "US Pacific (PST/PDT)", value: "America/Los_Angeles" },
    { label: "India Standard (IST)", value: "Asia/Kolkata" },
  ];

  const languageOptions = [
    { label: "English", value: "en" },
    { label: "Spanish / Español", value: "es" },
    { label: "French / Français", value: "fr" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Manage organization properties, tax settings, and receipts configurations</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Company Profile Settings
          </CardTitle>
          <CardDescription>Configure global parameters applied to all branch POS terminals</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-6 text-sm text-muted-foreground animate-pulse">
                Loading parameters...
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="companyName">Enterprise Name</Label>
                  <Input
                    id="companyName"
                    type="text"
                    error={errors.companyName?.message}
                    {...register("companyName")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="currency">Base Currency</Label>
                    <div className="relative flex items-center">
                      <DollarSign className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <Select
                        id="currency"
                        className="pl-10"
                        options={currencyOptions}
                        error={errors.currency?.message}
                        {...register("currency")}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="taxRate">VAT / Sales Tax Rate (%)</Label>
                    <div className="relative flex items-center">
                      <Percent className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.01"
                        placeholder="8.25"
                        className="pl-10"
                        error={errors.taxRate?.message}
                        {...register("taxRate")}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      id="timezone"
                      options={timezoneOptions}
                      error={errors.timezone?.message}
                      {...register("timezone")}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="language">System Language</Label>
                    <div className="relative flex items-center">
                      <Globe className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Select
                        id="language"
                        className="pl-10"
                        options={languageOptions}
                        error={errors.language?.message}
                        {...register("language")}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="receiptFooter">Receipt Invoice Footer message</Label>
                  <textarea
                    id="receiptFooter"
                    rows={3}
                    placeholder="e.g. Thanks for your business!"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register("receiptFooter")}
                  />
                  {errors.receiptFooter?.message && (
                    <p className="mt-1 text-xs text-destructive">{errors.receiptFooter.message}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end">
            <Button type="submit" isLoading={updateSettingsMutation.isPending} disabled={isLoading}>
              <Save className="h-4.5 w-4.5 mr-2" />
              <span>Save Configurations</span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
