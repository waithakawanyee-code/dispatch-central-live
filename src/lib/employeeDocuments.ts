import {
  AlertTriangle,
  Award,
  ClipboardCheck,
  GraduationCap,
  IdCard,
  HeartPulse,
  PackageOpen,
  LogOut,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type DocCategory =
  | "disciplinary"
  | "commendation"
  | "review"
  | "training_certificate"
  | "license"
  | "medical"
  | "onboarding"
  | "separation"
  | "other";

export interface DocCategoryMeta {
  id: DocCategory;
  label: string;
  icon: LucideIcon;
  driverVisible: boolean; // whether to show on the driver-side default groups
}

export const DOC_CATEGORIES: DocCategoryMeta[] = [
  { id: "disciplinary", label: "Disciplinary", icon: AlertTriangle, driverVisible: true },
  { id: "commendation", label: "Commendations", icon: Award, driverVisible: true },
  { id: "review", label: "Reviews", icon: ClipboardCheck, driverVisible: true },
  { id: "training_certificate", label: "Training Certificates", icon: GraduationCap, driverVisible: true },
  { id: "license", label: "Licenses", icon: IdCard, driverVisible: true },
  { id: "medical", label: "Medical", icon: HeartPulse, driverVisible: true },
  { id: "onboarding", label: "Onboarding", icon: PackageOpen, driverVisible: true },
  { id: "separation", label: "Separation", icon: LogOut, driverVisible: false },
  { id: "other", label: "Other", icon: FileText, driverVisible: true },
];

export function categoryMeta(id: string): DocCategoryMeta {
  return DOC_CATEGORIES.find((c) => c.id === id) ?? DOC_CATEGORIES[DOC_CATEGORIES.length - 1];
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
export const ALLOWED_EXT_HINT = "PDF, JPG, or PNG · up to 10 MB";

export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export interface EmployeeDocument {
  id: string;
  driver_id: string;
  doc_category: DocCategory;
  title: string;
  description: string | null;
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  visible_to_driver: boolean;
  requires_acknowledgment: boolean;
  effective_date: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  archived_at: string | null;
}

export interface EmployeeDocumentAck {
  id: string;
  document_id: string;
  driver_id: string;
  acknowledged_by: string;
  acknowledged_at: string;
  typed_signature: string;
}
