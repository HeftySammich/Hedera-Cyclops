'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { ProjectForm } from './project-form';

interface Project {
  id: string;
  name: string;
  xHandle: string | null;
  website: string | null;
  description: string;
  submittedById: string;
  submittedBy: {
    username: string | null;
    walletAddress: string;
  };
  vouches: { voucherId: string }[];
  trust: { vouchCount: number; score: number; tier: { key: string; label: string } };
}

export function ProjectList() {
  const { user, holdsCollection } = useWallet();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data.projects ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleVouch(project: Project, alreadyVouched: boolean) {
    setBusyId(project.id);
    try {
      await fetch(`/api/projects/${project.id}/vouches`, {
        method: alreadyVouched ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: alreadyVouched ? undefined : JSON.stringify({}),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectForm onCreated={load} />
      {loading ? (
        <p className="text-sm text-muted">Loading ledger…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted">No projects listed yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => {
            const alreadyVouched = Boolean(
              user && project.vouches.some((v) => v.voucherId === user.id)
            );
            const canVouch = Boolean(user && holdsCollection && project.submittedById !== user.id);
            return (
              <li key={project.id} className="border border-neutral-800 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sage">{project.name}</span>
                  <span className="text-xs uppercase text-muted">
                    {project.trust.tier.label} · {project.trust.vouchCount} vouches
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{project.description}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  {project.website ? (
                    <a
                      href={project.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted underline hover:text-sage"
                    >
                      Website
                    </a>
                  ) : null}
                  {project.xHandle ? (
                    <span className="text-muted">@{project.xHandle.replace(/^@/, '')}</span>
                  ) : null}
                  {canVouch ? (
                    <button
                      onClick={() => toggleVouch(project, alreadyVouched)}
                      disabled={busyId === project.id}
                      className="ml-auto text-muted hover:text-sage"
                    >
                      {alreadyVouched ? 'Remove vouch' : 'Vouch'}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
