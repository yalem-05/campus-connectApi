import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../config/database.js";
import { generateToken, AuthRequest } from "../middleware/auth.js";
import { UserRole } from "../types/index.js";

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["Admin", "Student", "Faculty", "Staff"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [data.email, data.username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, guid, username, email, role, first_name, last_name, is_email_verified`,
      [
        data.username,
        data.email,
        passwordHash,
        data.role,
        data.firstName,
        data.lastName,
        true,
      ]
    );

    const user = result.rows[0] as { id: number; guid: string; username: string; email: string; role: string; first_name: string; last_name: string; is_email_verified: boolean };
    const token = generateToken({ id: user.id, email: user.email, role: user.role as UserRole });

    if (data.role === "Student") {
      await query(
        `INSERT INTO students (student_id, first_name, last_name, email, date_of_birth, gender, enrollment_date, enrollment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `STU${Date.now()}`,
          data.firstName,
          data.lastName,
          data.email,
          "2000-01-01",
          "Male",
          new Date().toISOString().split("T")[0],
          "Active",
        ]
      );
    } else if (data.role === "Faculty") {
      await query(
        `INSERT INTO faculty (faculty_id, first_name, last_name, email, date_of_birth, hire_date, designation, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `FAC${Date.now()}`,
          data.firstName,
          data.lastName,
          data.email,
          "1980-01-01",
          new Date().toISOString().split("T")[0],
          "Lecturer",
          "Active",
        ]
      );
    }

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user.id,
        guid: user.guid,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        isEmailVerified: user.is_email_verified,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [data.email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0] as { id: number; guid: string; username: string; email: string; password_hash: string; role: string; first_name: string; last_name: string; is_email_verified: boolean };
    const validPassword = await bcrypt.compare(data.password, user.password_hash);

    if (!validPassword) {
      await query(
        "INSERT INTO login_history (user_id, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)",
        [user.id, req.ip, req.headers["user-agent"], false]
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await query(
      "UPDATE users SET last_login_date = NOW() WHERE id = $1",
      [user.id]
    );

    await query(
      "INSERT INTO login_history (user_id, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)",
      [user.id, req.ip, req.headers["user-agent"], true]
    );

    const token = generateToken({ id: user.id, email: user.email, role: user.role as UserRole });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        guid: user.guid,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        isEmailVerified: user.is_email_verified,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      "SELECT id, guid, username, email, role, first_name, last_name, is_email_verified, last_login_date FROM users WHERE id = $1",
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0] as { id: number; guid: string; username: string; email: string; role: string; first_name: string; last_name: string; is_email_verified: boolean; last_login_date: string };
    res.json({
      id: user.id,
      guid: user.guid,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      isEmailVerified: user.is_email_verified,
      lastLoginDate: user.last_login_date,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getLoginHistory = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      "SELECT login_date, ip_address, user_agent, success FROM login_history WHERE user_id = $1 ORDER BY login_date DESC LIMIT 10",
      [req.user?.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get login history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  res.json({ message: "Logged out successfully" });
};