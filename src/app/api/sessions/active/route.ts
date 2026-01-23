import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET the current active session
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeSession = await db.session.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    return NextResponse.json(activeSession);
  } catch (error) {
    console.error("Error fetching active session:", error);
    return NextResponse.json(
      { error: "Failed to fetch active session" },
      { status: 500 }
    );
  }
}
