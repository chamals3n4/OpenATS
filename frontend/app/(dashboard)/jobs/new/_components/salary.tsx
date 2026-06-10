"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PAY_FREQUENCY_LABELS } from "@/lib/job-labels";

interface SalarySectionProps {
  isIncluded: boolean;
  onIncludedChange: (value: boolean) => void;
  salaryType: "range" | "fixed";
  onSalaryTypeChange: (type: "range" | "fixed") => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  payFrequency: string;
  onPayFrequencyChange: (value: string) => void;
  salaryMin: string;
  onSalaryMinChange: (value: string) => void;
  salaryMax: string;
  onSalaryMaxChange: (value: string) => void;
  salaryFixed: string;
  onSalaryFixedChange: (value: string) => void;
}

export function SalarySection({
  isIncluded,
  onIncludedChange,
  salaryType,
  onSalaryTypeChange,
  currency,
  onCurrencyChange,
  payFrequency,
  onPayFrequencyChange,
  salaryMin,
  onSalaryMinChange,
  salaryMax,
  onSalaryMaxChange,
  salaryFixed,
  onSalaryFixedChange,
}: SalarySectionProps) {
  return (
    <div className="border-t border-slate-100 dark:border-neutral-800 pt-10 space-y-5 mt-4">
      <h3 className="text-[17px] font-semibold text-slate-800 dark:text-neutral-100">
        Salary Information
      </h3>

      <div className="space-y-5">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3 shrink-0">
            <Checkbox
              id="salary-info"
              variant="theme"
              checked={isIncluded}
              onCheckedChange={(checked) =>
                onIncludedChange(checked as boolean)
              }
            />
            <Label
              htmlFor="salary-info"
              className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer whitespace-nowrap"
            >
              Include Salary Information
            </Label>
          </div>

          <RadioGroup
            value={salaryType}
            onValueChange={(val) =>
              onSalaryTypeChange(val as "range" | "fixed")
            }
            className="flex items-center gap-10"
          >
            <div className="flex items-center gap-2.5">
              <RadioGroupItem variant="theme" value="range" id="range" />
              <Label
                htmlFor="range"
                className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer"
              >
                Salary Range
              </Label>
            </div>
            <div className="flex items-center gap-2.5">
              <RadioGroupItem variant="theme" value="fixed" id="fixed" />
              <Label
                htmlFor="fixed"
                className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer"
              >
                Fixed Salary
              </Label>
            </div>
          </RadioGroup>
        </div>

        {isIncluded && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                  Currency
                </Label>
                <Select
                  value={currency}
                  onValueChange={(val) => onCurrencyChange(val || "USD")}
                >
                  <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0 focus:border-slate-300 dark:focus:border-neutral-600">
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="LKR">LKR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                  Paid Every
                </Label>
                <Select
                  value={payFrequency}
                  onValueChange={(val) => onPayFrequencyChange(val || "yearly")}
                >
                  <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0 focus:border-slate-300 dark:focus:border-neutral-600">
                    <SelectValue>
                      {PAY_FREQUENCY_LABELS[payFrequency] ?? null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    {Object.entries(PAY_FREQUENCY_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {salaryType === "range" ? (
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                    Minimum Salary
                  </Label>
                  <Input
                    value={salaryMin}
                    onChange={(e) => onSalaryMinChange(e.target.value)}
                    placeholder="e.g. 50,000"
                    className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                    Maximum Salary
                  </Label>
                  <Input
                    value={salaryMax}
                    onChange={(e) => onSalaryMaxChange(e.target.value)}
                    placeholder="e.g. 80,000"
                    className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 pt-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                  Enter Fixed Salary
                </Label>
                <Input
                  value={salaryFixed}
                  onChange={(e) => onSalaryFixedChange(e.target.value)}
                  placeholder="e.g. 75,000"
                  className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
