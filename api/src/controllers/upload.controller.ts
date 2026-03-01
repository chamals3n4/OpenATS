import { Request, Response } from "express";
import { r2Service } from "../services/r2.service";
import { db } from "../db";
import { company } from "../db/schema";
import { eq } from "drizzle-orm";

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const isLogo = req.path.includes("logo");
    const folder = isLogo ? "logos" : "resumes";
    
    const publicUrl = await r2Service.uploadFile(req.file, folder as "resumes" | "logos");

    if (isLogo) {
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
    }

    res.status(200).json({ 
      data: {
        url: publicUrl,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      }
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file to storage" });
  }
};
