import { Request, Response } from "express";
import { z } from "zod";
import { companyService, departmentService } from "../services/company.service";

const upsertCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  email: z.string().email("Invalid email address"),
  website: z.string().url("Invalid URL").max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url("Invalid logo URL").max(1000).optional().nullable(),
});

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(255),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(255),
});

export const getCompany = async (req: Request, res: Response) => {
  try {
    const result = await companyService.get();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "failed to fetch company" });
  }
};

export const upsertCompany = async (req: Request, res: Response) => {
  try {
    const parsed = upsertCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        detail: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const cleanedData = {
      ...parsed.data,
      website: parsed.data.website ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      description: parsed.data.description ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
    };
    const result = await companyService.upsert(cleanedData);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to upsert company" });
  }
};

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const result = await departmentService.getAll();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validatin failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await departmentService.create(parsed.data);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Department name already exists" });
      return;
    }
    if (error?.message?.includes("Company must be set up")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to create department" });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid department ID" });
      return;
    }

    const parsed = updateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await departmentService.update(id, parsed.data);
    if (!result) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Department name already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to update department" });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid department ID" });
      return;
    }

    const result = await departmentService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error: "Cannot delete department that has jobs assigned to it",
      });
      return;
    }
    res.status(500).json({ error: "Failed to delete department" });
  }
};
