"use client";

import { useState, useRef } from "react";
import {
  PlusSignIcon,
  CloudUploadIcon,
  Building02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
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
  "h-10 bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 rounded-md shadow-none text-base placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:border-slate-400 dark:focus-visible:border-neutral-600 transition-colors";

const DESCRIPTION_MAX = 500;

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

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-2 lg:gap-8 border-b border-slate-100 dark:border-neutral-800">
      <div>
        <p className="text-base font-semibold text-slate-800 dark:text-neutral-100">
          {title}
        </p>
        <p className="text-sm text-slate-400 dark:text-neutral-500 mt-1 leading-relaxed max-w-[260px]">
          {description}
        </p>
      </div>
      <div className="min-w-0 max-w-lg">{children}</div>
    </div>
  );
}

function CompanyForm({
  company,
  isNew,
}: {
  company: Company;
  isNew?: boolean;
}) {
  const upsertCompany = useUpsertCompany();
  const uploadLogo = useUploadLogo();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(
    company.logoUrl ?? null,
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(
    company.logoUrl ?? null,
  );
  const [companyName, setCompanyName] = useState(company.name ?? "");
  const [email, setEmail] = useState(company.email ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [phone, setPhone] = useState(company.phone ?? "");
  const [address, setAddress] = useState(company.address ?? "");
  const [description, setDescription] = useState(company.description ?? "");

  const resetForm = () => {
    setPreview(company.logoUrl ?? null);
    setLogoUrl(company.logoUrl ?? null);
    setCompanyName(company.name ?? "");
    setEmail(company.email ?? "");
    setWebsite(company.website ?? "");
    setPhone(company.phone ?? "");
    setAddress(company.address ?? "");
    setDescription(company.description ?? "");
  };

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
        onSuccess: () =>
          toast.success(isNew ? "Company created" : "Changes saved"),
        onError: () => toast.error("Failed to save"),
      },
    );
  };

  const charsLeft = DESCRIPTION_MAX - description.length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 pb-6">
        <div>
          <h2 className="text-2xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
            Company Profile
          </h2>
          <p className="text-sm text-slate-400 dark:text-neutral-500 mt-1.5">
            Update your company photo and details here.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={resetForm}
            disabled={upsertCompany.isPending}
            className="h-8 px-4 rounded-md border-slate-200 dark:border-neutral-700 bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 text-sm shadow-none cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsertCompany.isPending}
            className="h-8 px-4 bg-theme hover:bg-theme-hover text-white rounded-md border border-theme shadow-none text-sm font-semibold cursor-pointer"
          >
            {upsertCompany.isPending
              ? "Saving…"
              : isNew
                ? "Create"
                : "Save"}
          </Button>
        </div>
      </div>

      <Row title="Company Name" description="This will be displayed on your profile.">
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className={inputCls}
        />
      </Row>

      <Row title="Contact Email" description="Where hiring notifications are sent.">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </Row>

      <Row title="Website" description="Your public website or careers page.">
        <Input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className={inputCls}
          placeholder="https://"
        />
      </Row>

      <Row title="Phone" description="A contact number for candidates or partners.">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
        />
      </Row>

      <Row title="Address" description="Your registered or office address.">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputCls}
        />
      </Row>

      <Row title="Tagline" description="A quick snapshot of your company.">
        <Textarea
          value={description}
          onChange={(e) =>
            setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
          }
          placeholder="A short description of your company shown on the careers page"
          rows={3}
          className={`${inputCls} h-auto resize-none`}
        />
        <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1.5">
          {charsLeft} characters left
        </p>
      </Row>

      <Row
        title="Company Logo"
        description="Update your company logo and then choose where you want it displayed."
      >
        <div className="flex items-stretch gap-4">
          <div className="h-28 w-28 flex items-center justify-center rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shrink-0 overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <HugeiconsIcon
                icon={Building02Icon}
                className="size-5 text-slate-400"
              />
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadLogo.isPending}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-600 hover:bg-slate-50 dark:hover:bg-neutral-800/60 transition-colors px-4 py-4 cursor-pointer"
          >
            {uploadLogo.isPending ? (
              <Loader2 className="size-4 animate-spin text-slate-400" />
            ) : (
              <span className="flex items-center justify-center size-7 rounded-full border border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-400">
                <HugeiconsIcon icon={CloudUploadIcon} className="size-3.5" />
              </span>
            )}
            <span className="text-xs text-slate-600 dark:text-neutral-300">
              <span className="font-semibold text-theme">Click to upload</span>{" "}
              or drag and drop
            </span>
            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
              PNG, JPG, WebP or GIF (max. 5MB)
            </span>
          </button>
        </div>
      </Row>
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
    createDept.mutate(
      { name: newName.trim() },
      {
        onSuccess: () => {
          setNewName("");
          setAddOpen(false);
          toast.success("Department added");
        },
        onError: () => toast.error("Failed to add department"),
      },
    );
  };

  const handleEdit = (id: number) => {
    if (!editVal.trim()) return;
    updateDept.mutate(
      { id, name: editVal.trim() },
      {
        onSuccess: () => {
          setEditId(null);
          toast.success("Department updated");
        },
        onError: () => toast.error("Failed to update"),
      },
    );
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteDept.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
        toast.success("Department deleted");
      },
      onError: () => toast.error("Failed to delete"),
    });
  };

  const deleteName =
    deleteId !== null
      ? (departments.find((d) => d.id === deleteId)?.name ?? "")
      : "";

  return (
    <>
      <Row
        title="Departments"
        description="Used to group jobs and candidates across your organization."
      >
        {!company ? (
          <p className="text-xs text-slate-400 dark:text-neutral-500">
            Save company details first to manage departments.
          </p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {departments.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-neutral-500 mb-3">
                No departments yet.
              </p>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 h-9 flex items-center rounded-md bg-theme/10 dark:bg-theme/15 border border-theme/20 dark:border-theme/25 px-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-neutral-200 truncate block">
                      {dept.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditId(dept.id);
                        setEditVal(dept.name);
                      }}
                      className="h-9 px-4 rounded-md bg-slate-700 hover:bg-slate-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 flex items-center text-sm font-semibold text-white cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(dept.id)}
                      className="h-9 px-4 rounded-md bg-red-600 hover:bg-red-500 flex items-center text-sm font-semibold text-white cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {company && (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full h-9 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-theme/40 text-sm font-semibold text-theme hover:border-theme hover:bg-theme/5 transition-colors"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" strokeWidth={2.5} />
            Add Department
          </button>
        )}
      </Row>

      {/* Add dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setNewName("");
        }}
      >
        <DialogContent className="!top-[20%] !translate-y-0 max-w-[380px] gap-4 rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-6 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
              Add Department
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-neutral-300 mb-1.5 block">
                Name
              </label>
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
                className="h-9 px-4 rounded-md border-slate-200 dark:border-neutral-700 bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 text-sm shadow-none cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || createDept.isPending}
                className="h-9 px-4 rounded-md bg-theme hover:bg-theme-hover text-white border border-theme shadow-none text-sm font-semibold cursor-pointer"
              >
                {createDept.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditId(null);
            setEditVal("");
          }
        }}
      >
        <DialogContent className="!top-[20%] !translate-y-0 max-w-[380px] gap-4 rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-6 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
              Edit Department
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-neutral-300 mb-1.5 block">
                Name
              </label>
              <Input
                autoFocus
                placeholder="e.g. Engineering"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && editId !== null && handleEdit(editId)}
                className={inputCls}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditId(null);
                  setEditVal("");
                }}
                className="h-9 px-4 rounded-md border-slate-200 dark:border-neutral-700 bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 text-sm shadow-none cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => editId !== null && handleEdit(editId)}
                disabled={!editVal.trim() || updateDept.isPending}
                className="h-9 px-4 rounded-md bg-theme hover:bg-theme-hover text-white border border-theme shadow-none text-sm font-semibold cursor-pointer"
              >
                {updateDept.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
              Delete this department?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-neutral-200">
                {deleteName}
              </strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-[34px] rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteDept.isPending}
              className="h-[34px] rounded-md border-none bg-red-600 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {deleteDept.isPending && <Spinner className="size-3.5" />}
              {deleteDept.isPending ? "Deleting" : "Delete"}
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
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {companyLoading ? (
            <div className="py-6 space-y-6">
              <div className="h-16 rounded-lg bg-slate-50 dark:bg-neutral-900 animate-pulse" />
              <div className="h-16 rounded-lg bg-slate-50 dark:bg-neutral-900 animate-pulse" />
              <div className="h-16 rounded-lg bg-slate-50 dark:bg-neutral-900 animate-pulse" />
            </div>
          ) : companyError ? (
            <div className="mt-6 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-4 py-3">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                Could not load settings. Try refreshing.
              </p>
            </div>
          ) : (
            <>
              {!company && (
                <div className="mt-6 mb-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Set up your organization to get started.
                  </p>
                </div>
              )}
              <CompanyForm
                key={company?.id ?? "new"}
                company={company ?? NEW_COMPANY_PLACEHOLDER}
                isNew={!company}
              />
              <DepartmentsPanel company={company} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
