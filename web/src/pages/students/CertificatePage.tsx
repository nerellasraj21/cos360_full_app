import React from "react";
import { useAuthStore } from "@/lib/authStore";
import { PermissionGuard } from "@/components/PermissionGuard";
import { CertificateUploadPage } from "./CertificateUploadPage";
import { StudentCertificatesPage } from "./StudentCertificatesPage";
import { MyCertificatesPage } from "./MyCertificatesPage";
import { ParentCertificatePage } from "./ParentCertificatePage";

const CertificatePage: React.FC = () => {
  const role = useAuthStore((s) => s.role);
  const roleName = role?.name.toLowerCase() ?? "";

  return (
    <PermissionGuard
      permissions={[
        ["student_certificates", "list"],
        ["student_certificates", "list_own"],
        ["student_certificates", "list_related"],
      ]}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view Certificates.</p>
          </div>
        </div>
      }
    >
      {roleName === "student" && <MyCertificatesPage />}
      {roleName === "parent" && <ParentCertificatePage />}
      {roleName === "teacher" && <StudentCertificatesPage />}
      {roleName !== "student" && roleName !== "parent" && roleName !== "teacher" && (
        <CertificateUploadPage />
      )}
    </PermissionGuard>
  );
};

export default CertificatePage;
