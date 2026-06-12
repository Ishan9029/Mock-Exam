import { TestClient } from "./test-client";

export default async function TestPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <TestClient sessionId={sessionId} />;
}
