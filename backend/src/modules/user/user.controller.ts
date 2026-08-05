import { Request, Response } from "express";
import { z } from "zod";
import { userService } from "./user.service";
import logger from "../../utils/logger";

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z
    .string()
    .url("Invalid avatar URL")
    .max(1000)
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

const createUserSchema = z.object({
  asgardeoUserId: z.string().min(1),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
});

export const getCurrentUser = async (req: Request, res: Response) => {
  res.status(200).json({ data: req.user });
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await userService.getAll();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const result = await userService.getById(id);
    if (!result) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const isSelf = req.user.id === id;
    const isSuperAdmin = req.user.role === "super_admin";

    if (!isSelf && !isSuperAdmin) {
      res.status(403).json({ error: "Only a super admin can edit other users" });
      return;
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    if (parsed.data.isActive !== undefined && !isSuperAdmin) {
      res
        .status(403)
        .json({ error: "Only a super admin can change account status" });
      return;
    }

    const result = await userService.update(id, parsed.data);

    if (!result) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`[updateUser] error:`, error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    if (req.user.role !== "super_admin") {
      res.status(403).json({ error: "Only a super admin can create users" });
      return;
    }

    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const result = await userService.create(parsed.data);
    res.status(201).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    if (req.user.role !== "super_admin") {
      res.status(403).json({ error: "Only a super admin can remove users" });
      return;
    }

    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    if (req.user.id === id) {
      res.status(400).json({ error: "You cannot remove your own account" });
      return;
    }

    const result = await userService.deactivate(id);
    if (!result) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`[deactivateUser] error:`, error);
    res.status(500).json({ error: "Failed to remove user" });
  }
};
