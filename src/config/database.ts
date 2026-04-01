import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "sms",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "1234",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export const query = async <T extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: unknown[]) => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  console.log("Executed query", { text: text.substring(0, 50), duration, rows: res.rowCount });
  return res;
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export async function initDatabase() {
  const adminPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "1234",
  });

  try {
    const dbName = process.env.DB_NAME || "sms";
    
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (result.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully`);
    }
  } catch (error) {
    console.log("Database may already exist:", error instanceof Error ? error.message : "Unknown error");
  } finally {
    await adminPool.end();
  }
}

export async function createTables() {
  const createTableSQL = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Departments Table
    CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        department_code VARCHAR(20) UNIQUE NOT NULL,
        department_name VARCHAR(100) NOT NULL,
        description TEXT,
        head_of_department VARCHAR(100),
        contact_email VARCHAR(100),
        contact_phone VARCHAR(20),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
    );

    -- Users Table (Authentication)
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('Admin', 'Student', 'Faculty', 'Staff')) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        is_email_verified BOOLEAN DEFAULT false,
        last_login_date TIMESTAMP,
        student_id INTEGER,
        faculty_id INTEGER,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
    );

    -- Students Table
    CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        student_id VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
        email VARCHAR(100) UNIQUE NOT NULL,
        phone_number VARCHAR(20),
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(50),
        country VARCHAR(50),
        postal_code VARCHAR(20),
        emergency_contact_name VARCHAR(100),
        emergency_contact_number VARCHAR(20),
        enrollment_date DATE DEFAULT CURRENT_DATE,
        enrollment_status VARCHAR(20) DEFAULT 'Active' CHECK (enrollment_status IN ('Active', 'Inactive', 'Graduated', 'Suspended', 'Withdrawn')),
        department_id INTEGER,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    -- Add foreign key for users to students
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_user_student' AND table_name = 'users'
        ) THEN
            ALTER TABLE users ADD CONSTRAINT fk_user_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
        END IF;
    END $$;

    -- Faculty Table
    CREATE TABLE IF NOT EXISTS faculty (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        faculty_id VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone_number VARCHAR(20),
        date_of_birth DATE NOT NULL,
        hire_date DATE DEFAULT CURRENT_DATE,
        designation VARCHAR(50) CHECK (designation IN ('Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer')),
        qualification VARCHAR(100),
        specialization VARCHAR(100),
        salary DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Retired', 'Terminated')),
        department_id INTEGER,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    -- Add foreign key for users to faculty
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_user_faculty' AND table_name = 'users'
        ) THEN
            ALTER TABLE users ADD CONSTRAINT fk_user_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL;
        END IF;
    END $$;

    -- Courses Table
    CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        course_code VARCHAR(20) UNIQUE NOT NULL,
        course_name VARCHAR(100) NOT NULL,
        description TEXT,
        credits INTEGER DEFAULT 3,
        duration_in_hours INTEGER,
        course_level VARCHAR(20) CHECK (course_level IN ('Beginner', 'Intermediate', 'Advanced')),
        prerequisites TEXT,
        fee DECIMAL(10, 2) DEFAULT 0,
        department_id INTEGER NOT NULL,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    -- Course Schedules Table
    CREATE TABLE IF NOT EXISTS course_schedules (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        course_id INTEGER NOT NULL,
        faculty_id INTEGER NOT NULL,
        classroom VARCHAR(50),
        day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        schedule_type VARCHAR(20) CHECK (schedule_type IN ('Lecture', 'Lab', 'Tutorial', 'Seminar')),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
    );

    -- Enrollments Table
    CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        student_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        enrollment_date DATE DEFAULT CURRENT_DATE,
        enrollment_status VARCHAR(20) DEFAULT 'Enrolled' CHECK (enrollment_status IN ('Enrolled', 'Completed', 'Dropped', 'Waitlisted')),
        semester VARCHAR(20) NOT NULL,
        academic_year INTEGER NOT NULL,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE(student_id, course_id, semester, academic_year)
    );

    -- Grades Table
    CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        student_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        semester VARCHAR(20) NOT NULL,
        academic_year INTEGER NOT NULL,
        marks_obtained DECIMAL(5, 2),
        total_marks DECIMAL(5, 2) DEFAULT 100,
        grade_letter VARCHAR(5),
        grade_point DECIMAL(3, 2),
        remarks TEXT,
        grade_date DATE DEFAULT CURRENT_DATE,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE(student_id, course_id, semester, academic_year)
    );

    -- Attendance Table
    CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        student_id INTEGER NOT NULL,
        course_schedule_id INTEGER NOT NULL,
        attendance_date DATE NOT NULL,
        status VARCHAR(20) CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')) NOT NULL,
        remarks TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_schedule_id) REFERENCES course_schedules(id) ON DELETE CASCADE,
        UNIQUE(student_id, course_schedule_id, attendance_date)
    );

    -- Payments Table
    CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        payment_id VARCHAR(20) UNIQUE NOT NULL,
        student_id INTEGER NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATE DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50),
        payment_type VARCHAR(20) CHECK (payment_type IN ('Tuition', 'Library', 'Lab', 'Hostel', 'Other')),
        reference_number VARCHAR(50),
        status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
        semester VARCHAR(20),
        academic_year INTEGER,
        description TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- Announcements Table
    CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        announcement_type VARCHAR(20) CHECK (announcement_type IN ('General', 'Academic', 'Event', 'Emergency')),
        publish_date DATE DEFAULT CURRENT_DATE,
        expiry_date DATE,
        target_audience VARCHAR(20) CHECK (target_audience IN ('All', 'Students', 'Faculty', 'Staff')),
        department_id INTEGER,
        author VARCHAR(100) NOT NULL,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    -- Student Documents Table
    CREATE TABLE IF NOT EXISTS student_documents (
        id SERIAL PRIMARY KEY,
        guid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
        student_id INTEGER NOT NULL,
        document_type VARCHAR(50),
        document_name VARCHAR(100) NOT NULL,
        file_path TEXT NOT NULL,
        file_type VARCHAR(50),
        file_size BIGINT,
        upload_date DATE DEFAULT CURRENT_DATE,
        remarks TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- Login History Table
    CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        login_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN DEFAULT true,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
    CREATE INDEX IF NOT EXISTS idx_students_department ON students(department_id);
    CREATE INDEX IF NOT EXISTS idx_faculty_faculty_id ON faculty(faculty_id);
    CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
    CREATE INDEX IF NOT EXISTS idx_grades_course ON grades(course_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_publish ON announcements(publish_date);
  `;

  try {
    await query(createTableSQL);
    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function seedDefaultData() {
  try {
    const existingAdmin = await query("SELECT id FROM users WHERE email = 'admin@school.edu'");
    
    if (existingAdmin.rows.length === 0) {
      const bcrypt = await import("bcryptjs");
      const adminPassword = await bcrypt.default.hash("admin123", 10);
      
      await query(
        `INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["admin", "admin@school.edu", adminPassword, "Admin", "System", "Administrator", true]
      );
      console.log("Default admin user created (email: admin@school.edu, password: admin123)");
    }

    const existingDepts = await query<{ count: string }>("SELECT COUNT(*) as count FROM departments");
    if (parseInt(existingDepts.rows[0].count) === 0) {
      await query(`
        INSERT INTO departments (department_code, department_name, description, head_of_department, contact_email, contact_phone) VALUES
        ('CS', 'Computer Science', 'Department of Computer Science and Engineering', 'Dr. John Smith', 'cs@school.edu', '555-0101'),
        ('ENG', 'English', 'Department of English Language and Literature', 'Dr. Sarah Johnson', 'eng@school.edu', '555-0102'),
        ('MATH', 'Mathematics', 'Department of Mathematics', 'Dr. Michael Brown', 'math@school.edu', '555-0103'),
        ('PHY', 'Physics', 'Department of Physics', 'Dr. Emily Davis', 'phy@school.edu', '555-0104'),
        ('CHEM', 'Chemistry', 'Department of Chemistry', 'Dr. Robert Wilson', 'chem@school.edu', '555-0105')
      `);
      console.log("Default departments created");
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding data:", error instanceof Error ? error.message : "Unknown error");
  }
}