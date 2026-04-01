import { Router } from "express";
import { register, login, getProfile, getLoginHistory, logout } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticateToken, getProfile);
router.get("/history", authenticateToken, getLoginHistory);
router.post("/logout", authenticateToken, logout);

export default router;   