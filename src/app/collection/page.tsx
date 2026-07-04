import { Prompt } from '@/components/ascii/prompt';
import { CollectionBrowser } from '@/components/collection/collection-browser';

export default function CollectionPage() {
  return (
    <div className="flex flex-col gap-6">
      <Prompt>ls ./collection --traits</Prompt>
      <CollectionBrowser />
    </div>
  );
}
