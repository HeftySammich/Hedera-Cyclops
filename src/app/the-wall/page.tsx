import { Prompt } from '@/components/ascii/prompt';
import { EventList } from '@/components/wall/event-list';

export default function TheWallPage() {
  return (
    <div className="flex flex-col gap-6">
      <Prompt>cat ./the-wall.ics</Prompt>
      <EventList />
    </div>
  );
}
