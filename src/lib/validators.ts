import { z } from "zod";

// Login Schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Register Step 1 - Account
export const registerStep1Schema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be less than 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterStep1Data = z.infer<typeof registerStep1Schema>;

// Register Step 2 - Profile
export const registerStep2Schema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  dateOfBirth: z.string().refine(
    (date) => {
      const dob = new Date(date);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age >= 18;
    },
    { message: "You must be at least 18 years old" },
  ),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"], {
    required_error: "Please select your gender",
  }),
  country: z.string().min(1, "Please select your country"),
  bio: z.string().max(200, "Bio must be less than 200 characters").optional(),
});

export type RegisterStep2Data = z.infer<typeof registerStep2Schema>;

// Register Step 3 - Interests
export const registerStep3Schema = z.object({
  interests: z
    .array(z.string())
    .min(3, "Select at least 3 interests")
    .max(10, "Maximum 10 interests"),
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms of Service" }),
  }),
  agreePrivacy: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Privacy Policy" }),
  }),
});

export type RegisterStep3Data = z.infer<typeof registerStep3Schema>;

// Profile Edit Schema
export const profileEditSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  bio: z.string().max(200, "Bio must be less than 200 characters"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  country: z.string().min(1, "Please select your country"),
  dateOfBirth: z.string().optional(),
});

export type ProfileEditFormData = z.infer<typeof profileEditSchema>;

// Change Password Schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// Contact Form Schema
export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  subject: z.string().min(1, "Please select a subject"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message is too long"),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Report Schema
export const reportSchema = z.object({
  reason: z.enum(
    [
      "nudity",
      "harassment",
      "spam",
      "underage",
      "hate_speech",
      "violence",
      "other",
    ],
    {
      required_error: "Please select a reason",
    },
  ),
  description: z.string().max(500, "Description is too long").optional(),
});

export type ReportFormData = z.infer<typeof reportSchema>;

// Message Schema
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message is too long"),
});

export type MessageFormData = z.infer<typeof messageSchema>;
