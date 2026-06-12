import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResults } from "@/lib/grading";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const results = await getResults(id, session.user.id);
    return NextResponse.json(results);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Results not found.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
