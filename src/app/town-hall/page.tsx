import { Prompt } from '@/components/ascii/prompt';
import { TownHallFeed } from '@/components/town-hall/town-hall-feed';

export default function TownHallPage() {
  return (
    <div className="flex flex-col gap-6">
      <Prompt live>tail -f ./town-hall</Prompt>
      <TownHallFeed />
    </div>
  );
}
