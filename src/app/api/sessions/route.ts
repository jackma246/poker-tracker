import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET all sessions for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await db.session.findMany({
      where: { userId: session.user.id },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST create a new session
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { location, blinds, buyIn, tableSize, notes } = body;

    if (!location || !blinds || buyIn === undefined) {
      return NextResponse.json(
        { error: "Location, blinds, and buy-in are required" },
        { status: 400 }
      );
    }

    // Check if user already has an active session
    const activeSession = await db.session.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (activeSession) {
      return NextResponse.json(
        { error: "You already have an active session" },
        { status: 400 }
      );
    }

    const newSession = await db.session.create({
      data: {
        userId: session.user.id,
        location,
        blinds,
        buyIn: parseFloat(buyIn),
        tableSize: tableSize || 9,
        notes: notes || null,
        isActive: true,
      },
    });

    return NextResponse.json(newSession);
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
