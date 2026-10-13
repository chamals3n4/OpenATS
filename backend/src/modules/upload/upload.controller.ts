import { Request, Response } from "express";
import { r2Service } from "../../shared/services/r2.service";
import { db } from "../../db";
import { company } from "../../db/schema";
import { eq } from "drizzle-orm";
import logger from "../../utils/logger";

export const uploadLogo = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const publicUrl = await r2Service.uploadLogo(req.file);

    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;

    if (companyId) {
      await db.update(company)
        .set({ logoUrl: publicUrl, updatedAt: new Date() })
        .where(eq(company.id, companyId));
    } else {
      const [firstCompany] = await db.select().from(company).limit(1);
      if (firstCompany) {
        await db.update(company)
          .set({ logoUrl: publicUrl, updatedAt: new Date() })
          .where(eq(company.id, firstCompany.id));
      }
    }

    res.status(200).json({
      data: {
        url: publicUrl,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      }
    });
  } catch (error) {
    logger.error("Upload error:" + error);
    res.status(500).json({ error: "Failed to upload file to storage" });
  }
};

/**
 * A CV uploaded from the careers page, before the application is sent. The uploader is anonymous,
 * so they get back the file's key, which the apply request then names, and never a URL: the file
 * is in the private bucket and cannot be opened from outside.
 */
export const uploadPublicResume = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const key = await r2Service.uploadResume(req.file);

    res.status(200).json({
      data: {
        key,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      }
    });
  } catch (error) {
    logger.error("Upload error:" + error);
    res.status(500).json({ error: "Failed to upload file to storage" });
  }
};
