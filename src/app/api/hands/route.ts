import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET all hands for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hands = await db.hand.findMany({
      where: { userId: session.user.id },
      orderBy: { playedAt: "desc" },
    });

    return NextResponse.json(hands);
  } catch (error) {
    console.error("Error fetching hands:", error);
    return NextResponse.json(
      { error: "Failed to fetch hands" },
      { status: 500 }
    );
  }
}

// POST create a new hand
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      blinds,
      tableSize,
      playerCount,
      heroCards,
      heroPosition,
      flop,
      turn,
      river,
      villainCards,
      villainPosition,
      preflopAction,
      flopAction,
      turnAction,
      riverAction,
      potSize,
      result,
      profit,
      title,
      notes,
      playedAt,
    } = body;

    if (!heroCards || heroCards.length !== 2 || !heroPosition) {
      return NextResponse.json(
        { error: "Hero cards and position are required" },
        { status: 400 }
      );
    }

    const newHand = await db.hand.create({
      data: {
        userId: session.user.id,
        blinds: blinds || "1/2",
        tableSize: tableSize || 9,
        playerCount: playerCount || 9,
        heroCards,
        heroPosition,
        flop: flop || [],
        turn: turn || null,
        river: river || null,
        villainCards: villainCards || [],
        villainPosition: villainPosition || null,
        preflopAction: preflopAction || null,
        flopAction: flopAction || null,
        turnAction: turnAction || null,
        riverAction: riverAction || null,
        potSize: potSize || null,
        result: result || "won",
        profit: profit || 0,
        title: title || null,
        notes: notes || null,
        playedAt: playedAt ? new Date(playedAt) : new Date(),
      },
    });

    return NextResponse.json(newHand);
  } catch (error) {
    console.error("Error creating hand:", error);
    return NextResponse.json(
      { error: "Failed to create hand" },
      { status: 500 }
    );
  }
}
