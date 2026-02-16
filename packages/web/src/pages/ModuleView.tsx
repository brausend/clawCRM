import { useParams } from "react-router-dom";
import ModuleRenderer from "../components/ModuleRenderer.js";

export default function ModuleView() {
  const { moduleId } = useParams<{ moduleId: string }>();

  if (!moduleId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Kein Modul ausgewaehlt.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
        {moduleId}
      </h2>
      <ModuleRenderer moduleId={moduleId} />
    </div>
  );
}
