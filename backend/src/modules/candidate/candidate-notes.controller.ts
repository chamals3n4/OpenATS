import type { Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { candidateNotes, candidates, db, jobPipelineStages, users } from "../../db";
import { parseRoomId } from "../../shared/auth/job-access";
import { getErrorMessage } from "../../utils/error.utils";
import logger from "../../utils/logger";

const bodySchema = z.object({ body: z.string().trim().min(1).max(20000) }).strict();
const projection = { id: candidateNotes.id, candidateId: candidateNotes.candidateId, body: candidateNotes.body, authorId: candidateNotes.authorId, authorName: users.name, stageName: candidateNotes.stageName, createdAt: candidateNotes.createdAt, updatedAt: candidateNotes.updatedAt };

export async function listNotes(req: Request, res: Response) {
  try {
    const candidateId = Number(req.params.id);
    const rows = await db.select(projection).from(candidateNotes).leftJoin(users, eq(candidateNotes.authorId, users.id)).where(eq(candidateNotes.candidateId, candidateId)).orderBy(desc(candidateNotes.createdAt), desc(candidateNotes.id));
    res.json({ data: rows });
  } catch (error) { logger.error(`Failed to load candidate notes: ${getErrorMessage(error)}`); res.status(500).json({ error: "Failed to load notes" }); }
}

export async function createNote(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Note must be between 1 and 20,000 characters" }); return; }
  try {
    const [note] = await db.insert(candidateNotes).values({ candidateId: Number(req.params.id), authorId: req.user.id, body: parsed.data.body, stageName: sql`(select ${jobPipelineStages.name} from ${candidates} left join ${jobPipelineStages} on ${candidates.currentStageId} = ${jobPipelineStages.id} where ${candidates.id} = ${Number(req.params.id)})` }).returning({ id: candidateNotes.id });
    res.status(201).json({ data: { id: note!.id } });
  } catch (error) { logger.error(`Failed to create candidate note: ${getErrorMessage(error)}`); res.status(500).json({ error: "Failed to create note" }); }
}

export async function updateNote(req: Request, res: Response) {
  const noteId = parseRoomId(req.params.noteId);
  const parsed = bodySchema.safeParse(req.body);
  if (noteId === null || !parsed.success) { res.status(400).json({ error: "Invalid note or content" }); return; }
  try {
    const updated = await db.update(candidateNotes).set({ body: parsed.data.body, updatedAt: new Date() }).where(and(eq(candidateNotes.id, noteId), eq(candidateNotes.candidateId, Number(req.params.id)))).returning({ id: candidateNotes.id });
    if (!updated.length) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ data: updated[0] });
  } catch (error) { logger.error(`Failed to update candidate note: ${getErrorMessage(error)}`); res.status(500).json({ error: "Failed to update note" }); }
}

export async function deleteNote(req: Request, res: Response) {
  const noteId = parseRoomId(req.params.noteId);
  if (noteId === null) { res.status(400).json({ error: "Invalid note id" }); return; }
  try {
    const deleted = await db.delete(candidateNotes).where(and(eq(candidateNotes.id, noteId), eq(candidateNotes.candidateId, Number(req.params.id)))).returning({ id: candidateNotes.id });
    if (!deleted.length) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ data: deleted[0] });
  } catch (error) { logger.error(`Failed to delete candidate note: ${getErrorMessage(error)}`); res.status(500).json({ error: "Failed to delete note" }); }
}
