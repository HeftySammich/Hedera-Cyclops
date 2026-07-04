import { Prompt } from '@/components/ascii/prompt';
import { ProjectList } from '@/components/ledger/project-list';

export default function TheLedgerPage() {
  return (
    <div className="flex flex-col gap-6">
      <Prompt>grep -r &quot;trust&quot; ./projects</Prompt>
      <ProjectList />
    </div>
  );
}
