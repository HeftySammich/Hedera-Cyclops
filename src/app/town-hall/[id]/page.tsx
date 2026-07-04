import { ThreadView } from './thread-view';

export default function ThreadPage({ params }: { params: { id: string } }) {
  return <ThreadView postId={params.id} />;
}
