"use client";

import { useState, useRef } from "react";
import {
  PencilEdit01Icon,
  Delete02Icon,
  ImageUploadIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import type { Company } from "@/types";
import {
  useCompany,
  useUpsertCompany,
  useUploadLogo,
  useDepartments,
  useCreateDepartment,
  useDeleteDepartment,
  useUpdateDepartment,
} from "@/hooks/queries/use-company";

const inputCls =
  "h-9 bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 rounded-md shadow-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 transition-colors";

const NEW_COMPANY_PLACEHOLDER: Company = {
  id: 0,
  name: "",
  email: "",
  website: null,
  phone: null,
  address: null,
  description: null,
  logoUrl: null,
  createdAt: "",
  updatedAt: "",
};

function CompanyForm({ company, isNew }: { company: Company; isNew?: boolean }) {
  const upsertCompany = useUpsertCompany();
  const uploadLogo = useUploadLogo();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(company.logoUrl ?? null);
  const [logoUrl, setLogoUrl] = useState<string | null>(company.logoUrl ?? null);
  const [companyName, setCompanyName] = useState(company.name ?? "");
  const [email, setEmail] = useState(company.email ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [phone, setPhone] = useState(company.phone ?? "");
  const [address, setAddress] = useState(company.address ?? "");
  const [description, setDescription] = useState(company.description ?? "");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    uploadLogo.mutate(file, {
      onSuccess: (data) => {
        setLogoUrl(data.url);
        toast.success("Logo updated");
      },
      onError: (err) => toast.error(err.message ?? "Upload failed"),
    });
    e.target.value = "";
  };

  const handleSave = () => {
    upsertCompany.mutate(
      {
        name: companyName,
        email,
        website: website || null,
        phone: phone || null,
        address: address || null,
        description: description || null,
        logoUrl,
      },
      {
        onSuccess: () => toast.success(isNew ? "Company created" : "Changes saved"),
        onError: () => toast.error("Failed to save"),
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Logo */}
      <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500 mb-4">
          Company Logo
        </p>
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="h-16 w-auto max-w-[200px] min-w-16 px-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 flex items-center justify-center cursor-pointer hover:border-slate-300 dark:hover:border-neutral-600 transition-colors overflow-hidden shrink-0"
          >
            {uploadLogo.isPending ? (
              <Loader2 className="size-5 animate-spin text-slate-400" />
            ) : preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <HugeiconsIcon icon={ImageUploadIcon} className="size-6 text-slate-300" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploadLogo.isPending}
              className="h-8 px-4 rounded-md text-white shadow-none border-none text-xs font-medium cursor-pointer"
              style={{ backgroundColor: "var(--theme-color)" }}
            >
              {uploadLogo.isPending ? "Uploading…" : "Upload Logo"}
            </Button>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1.5">PNG, JPG, WebP · up to 5 MB</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">
          Company Information
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of your company shown on the careers page"
              rows={4}
              className={`${inputCls} h-auto resize-none`}
            />
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={upsertCompany.isPending}
          className="w-full h-9 text-white rounded-md shadow-none border-none text-sm font-semibold cursor-pointer"
          style={{ backgroundColor: "var(--theme-color)" }}
        >
          {upsertCompany.isPending ? "Saving…" : isNew ? "Create Company" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function DepartmentsPanel({ company }: { company: Company | null | undefined }) {
  const { data: deptData } = useDepartments({ enabled: !!company });
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const departments = deptData?.data ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    createDept.mutate({ name: newName.trim() }, {
      onSuccess: () => { setNewName(""); setAddOpen(false); toast.success("Department added"); },
      onError: () => toast.error("Failed to add department"),
    });
  };

  const handleEdit = (id: number) => {
    if (!editVal.trim()) return;
    updateDept.mutate({ id, name: editVal.trim() }, {
      onSuccess: () => { setEditId(null); toast.success("Department updated"); },
      onError: () => toast.error("Failed to update"),
    });
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteDept.mutate(deleteId, {
      onSuccess: () => { setDeleteId(null); toast.success("Department deleted"); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  const deleteName = deleteId !== null ? (departments.find((d) => d.id === deleteId)?.name ?? "") : "";

  return (
    <>
      <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500 mb-4">
          Departments
        </p>

        {!company ? (
          <p className="text-xs text-slate-400 dark:text-neutral-500 mb-4">
            Save company details first to manage departments.
          </p>
        ) : (
          <div className="space-y-2 mb-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="group flex items-center justify-between gap-2 rounded-md bg-[var(--theme-color)]/8 dark:bg-[var(--theme-color)]/10 border border-[var(--theme-color)]/15 px-3 py-2"
              >
                {editId === dept.id ? (
                  <Input
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit(dept.id);
                      if (e.key === "Escape") setEditId(null);
                    }}
                    onBlur={() => handleEdit(dept.id)}
                    className="flex-1 h-6 bg-white/60 dark:bg-neutral-800 border-[var(--theme-color)]/30 rounded text-xs shadow-none focus-visible:ring-0 px-2"
                  />
                ) : (
                  <span className="text-sm font-medium text-[var(--theme-color)] truncate">{dept.name}</span>
                )}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => { setEditId(dept.id); setEditVal(dept.name); }}
                    className="size-5 rounded flex items-center justify-center text-[var(--theme-color)]/50 hover:text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} className="size-3" />
                  </button>
                  <button
                    onClick={() => setDeleteId(dept.id)}
                    className="size-5 rounded flex items-center justify-center text-[var(--theme-color)]/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {company && (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 dark:border-neutral-700 py-2 text-xs font-medium text-slate-400 dark:text-neutral-500 hover:border-[var(--theme-color)]/50 hover:text-[var(--theme-color)] hover:bg-[var(--theme-color)]/5 transition-colors"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-3" strokeWidth={2.5} />
            Add Department
          </button>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setNewName(""); }}>
        <DialogContent className="!top-[20%] !translate-y-0 max-w-[340px] rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-5 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Add Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">Name</Label>
              <Input
                autoFocus
                placeholder="e.g. Engineering"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className={inputCls}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="h-8 px-4 rounded-md border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 text-xs shadow-none cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || createDept.isPending}
                className="h-8 px-4 rounded-md text-white shadow-none border-none text-xs font-medium cursor-pointer"
                style={{ backgroundColor: "var(--theme-color)" }}
              >
                {createDept.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Delete department?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-neutral-400">
              <span className="font-medium text-slate-700 dark:text-neutral-200">{deleteName}</span> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-8 px-4 rounded-md border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-xs shadow-none cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteDept.isPending}
              className="h-8 px-4 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs shadow-none border-none cursor-pointer"
            >
              {deleteDept.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SettingsGeneralPage() {
  const { data: companyData, isPending: companyLoading, isError: companyError } = useCompany();
  const company = companyData?.data;

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
        <h1 className="text-base font-semibold text-slate-900 dark:text-neutral-100 leading-none">General Settings</h1>
        <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">Manage your organization profile and departments</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {companyLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
            <div className="space-y-4">
              <div className="h-28 rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 animate-pulse" />
              <div className="h-64 rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 animate-pulse" />
            </div>
            <div className="h-48 rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 animate-pulse" />
          </div>
        ) : companyError ? (
          <div className="rounded-md border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Could not load settings. Try refreshing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
            <div className="space-y-4">
              {!company && (
                <div className="rounded-md border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">Set up your organization to get started.</p>
                </div>
              )}
              <CompanyForm key={company?.id ?? "new"} company={company ?? NEW_COMPANY_PLACEHOLDER} isNew={!company} />
            </div>
            <div className="lg:sticky lg:top-5">
              <DepartmentsPanel company={company} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
