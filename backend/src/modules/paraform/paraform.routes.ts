import { Router } from "express";
import { requireAdmin } from "../../middlewares/role.middleware";
import {
  disconnect,
  getAccess,
  getConnectUrl,
  getOverview,
  linkRole,
  listRoles,
  listRuns,
  syncNow,
  unlinkRole,
} from "./paraform.controller";

// One connection for the whole company, so only super admins see or change it.
const router: Router = Router();
router.use(requireAdmin);

router.get("/", getOverview);
router.delete("/", disconnect);
router.get("/access", getAccess);
router.get("/connect-url", getConnectUrl);
router.get("/roles", listRoles);
router.post("/role-links", linkRole);
router.delete("/role-links/:id", unlinkRole);
router.post("/sync", syncNow);
router.get("/runs", listRuns);

export default router;
