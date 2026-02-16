import { Suspense } from "react";

interface ModuleRendererProps {
  moduleId: string;
}

/**
 * Renders a dynamically loaded module's UI.
 * Modules provide their own React components via the CrmModule interface.
 * This component handles lazy loading and error boundaries.
 */
export default function ModuleRenderer({ moduleId }: ModuleRendererProps) {
  // In a full implementation, this would dynamically import the module's
  // UI components based on moduleId. For now, show a placeholder.
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">Modul: {moduleId}</p>
        <p className="mt-2">
          Die UI fuer dieses Modul wird dynamisch geladen, sobald es installiert ist.
        </p>
      </div>
    </Suspense>
  );
}
