import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { location, blinds, buyIn, cashOut, tips, rebuys, startTime, endTime, notes } = body;

    if (!location || !blinds || buyIn === undefined || cashOut === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newSession = await db.session.create({
      data: {
        userId: session.user.id,
        location,
        blinds,
        buyIn: parseFloat(buyIn),
        cashOut: parseFloat(cashOut),
        tips: parseFloat(tips) || 0,
        rebuys: rebuys || [],
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes: notes || null,
        isActive: false, // Past sessions are always completed
      },
    });

    return NextResponse.json(newSession);
  } catch (error) {
    console.error("Error importing session:", error);
    return NextResponse.json(
      { error: "Failed to import session" },
      { status: 500 }
    );
  }
}
