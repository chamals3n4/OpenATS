"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertCompany, useUploadLogo } from "@/hooks/queries/use-company";
import type { Company } from "@/types";
import { FormField, inputCls } from "./form-field";
import { LogoField } from "./logo-field";

const DESCRIPTION_MAX = 500;
const LOGO_MAX_BYTES = 10 * 1024 * 1024;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Values = {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  description: string;
  logoUrl: string | null;
};

const toValues = (c: Company): Values => ({
  name: c.name ?? "",
  email: c.email ?? "",
  phone: c.phone ?? "",
  website: c.website ?? "",
  address: c.address ?? "",
  description: c.description ?? "",
  logoUrl: c.logoUrl ?? null,
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 border-t border-slate-200 px-6 py-6 first:border-t-0 dark:border-neutral-800">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function CompanyForm({
  company,
  isNew,
}: {
  company: Company;
  isNew: boolean;
}) {
  const upsertCompany = useUpsertCompany();
  const uploadLogo = useUploadLogo();

  const [values, setValues] = useState<Values>(() => toValues(company));
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const baseline = toValues(company);
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const isDirty = (Object.keys(values) as (keyof Values)[]).some(
    (k) => (values[k] ?? "") !== (baseline[k] ?? ""),
  );

  const errors = {
    name: values.name.trim() ? null : "Company name is required.",
    email: !values.email.trim()
      ? "Contact email is required."
      : EMAIL_RE.test(values.email.trim())
        ? null
        : "Enter a valid email address.",
  };
  const hasErrors = Boolean(errors.name || errors.email);

  const handleLogo = (file: File) => {
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("That image is larger than 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    uploadLogo.mutate(file, {
      onSuccess: (data) => set("logoUrl", data.url),
      onError: (err) => {
        setLogoPreview(null);
        toast.error(err.message ?? "Logo upload failed");
      },
    });
  };

  const handleDiscard = () => {
    setValues(baseline);
    setLogoPreview(null);
    setShowErrors(false);
  };

  const handleSave = () => {
    setShowErrors(true);
    if (hasErrors) return;
    upsertCompany.mutate(
      {
        name: values.name.trim(),
        email: values.email.trim(),
        website: values.website.trim() || null,
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
        description: values.description.trim() || null,
        logoUrl: values.logoUrl,
      },
      {
        onSuccess: () => {
          setLogoPreview(null);
          setShowErrors(false);
          toast.success(isNew ? "Company created" : "Changes saved");
        },
        onError: () => toast.error("Failed to save"),
      },
    );
  };

  const logoSrc = logoPreview ?? values.logoUrl;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
          Company profile
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          {isNew
            ? "Add your company details to get started."
            : "This information appears on your careers page and job listings."}
        </p>
      </div>

      <Section title="Brand" description="How your company is identified.">
        <LogoField
          companyName={values.name}
          logoSrc={logoSrc}
          isUploading={uploadLogo.isPending}
          onSelectFile={handleLogo}
          onRemove={() => {
            set("logoUrl", null);
            setLogoPreview(null);
          }}
        />
        <FormField
          label="Company name"
          htmlFor="company-name"
          required
          error={showErrors ? errors.name : null}
        >
          <Input
            id="company-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Acme Inc."
            className={inputCls}
          />
        </FormField>
      </Section>

      <Section
        title="Contact"
        description="Where candidates and your team can reach you."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Contact email"
            htmlFor="company-email"
            required
            error={showErrors ? errors.email : null}
          >
            <Input
              id="company-email"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="careers@acme.com"
              className={inputCls}
            />
          </FormField>
          <FormField label="Phone" htmlFor="company-phone">
            <Input
              id="company-phone"
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputCls}
            />
          </FormField>
          <FormField label="Website" htmlFor="company-website">
            <Input
              id="company-website"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://acme.com"
              className={inputCls}
            />
          </FormField>
          <FormField label="Address" htmlFor="company-address">
            <Input
              id="company-address"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="City, Country"
              className={inputCls}
            />
          </FormField>
        </div>
      </Section>

      <Section
        title="About"
        description="A short introduction candidates see on your careers page."
      >
        <FormField
          label="Description"
          htmlFor="company-description"
          hint={`${DESCRIPTION_MAX - values.description.length} characters left`}
        >
          <Textarea
            id="company-description"
            value={values.description}
            onChange={(e) =>
              set("description", e.target.value.slice(0, DESCRIPTION_MAX))
            }
            placeholder="What does your company do, and what is it like to work there?"
            rows={4}
            className="min-h-28 resize-y border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </FormField>
      </Section>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-neutral-800 dark:bg-neutral-950/50">
        <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-400">
          {isDirty && !isNew && (
            <>
              <span className="size-2 rounded-full bg-amber-500" />
              Unsaved changes
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="cancel"
              onClick={handleDiscard}
              disabled={!isDirty || upsertCompany.isPending}
              className="h-9 px-4 text-sm"
            >
              Discard
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={
              upsertCompany.isPending ||
              uploadLogo.isPending ||
              (!isNew && !isDirty)
            }
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            {upsertCompany.isPending && <Spinner className="size-3.5" />}
            {upsertCompany.isPending
              ? "Saving"
              : isNew
                ? "Create company"
                : "Save changes"}
          </Button>
        </div>
      </footer>
    </section>
  );
}
