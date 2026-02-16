import { useEffect } from "react";
import { useStore } from "../lib/store.js";
import { rpc } from "../lib/ws-client.js";
import { RpcMethods } from "@clawcrm/shared";
import type { Project } from "@clawcrm/shared";

export default function Projects() {
  const projects = useStore((s) => s.projects);
  const setProjects = useStore((s) => s.setProjects);

  useEffect(() => {
    rpc<Project[]>(RpcMethods.MANAGE_PROJECT, { action: "list" }).then(
      setProjects,
    );
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Projects
      </h2>

      {projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No projects yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                  {project.description}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Created:{" "}
                {new Date(project.createdAt).toLocaleDateString("de-DE")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
