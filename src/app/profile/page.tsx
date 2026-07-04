import { Prompt } from '@/components/ascii/prompt';
import { ProfileEditor } from '@/components/profile/profile-editor';

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <Prompt>whoami</Prompt>
      <ProfileEditor />
    </div>
  );
}
