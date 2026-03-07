import React from "react";
import { useAuthStore } from "@/lib/authStore";
import { CertificateUploadPage } from "./CertificateUploadPage";
import { StudentCertificatesPage } from "./StudentCertificatesPage";
import { MyCertificatesPage } from "./MyCertificatesPage";
import { ParentCertificatePage } from "./ParentCertificatePage";

/**
 * Role-aware certificate page router.
 *
 * Admin / Staff  → CertificateUploadPage  (issue + manage all certs)
 * Teacher        → StudentCertificatesPage (read-only, per-student view)
 * Student        → MyCertificatesPage      (own certs via /certificates/my)
 * Parent         → ParentCertificatePage   (child certs via /certificates/my-child/{id})
 */
const CertificatePage: React.FC = () => {
  const role = useAuthStore((s) => s.role);
  const entityId = useAuthStore((s) => s.entityId);

  const roleName = role?.name.toLowerCase() ?? "";

  if (roleName === "student") {
    return <MyCertificatesPage />;
  }

  if (roleName === "parent") {
    return <ParentCertificatePage parentEntityId={entityId} />;
  }

  if (roleName === "teacher") {
    return <StudentCertificatesPage />;
  }

  // Admin / Staff — full management
  return <CertificateUploadPage />;
};

export default CertificatePage;
