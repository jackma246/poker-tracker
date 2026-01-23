import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET a single hand
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hand = await db.hand.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!hand) {
      return NextResponse.json({ error: "Hand not found" }, { status: 404 });
    }

    return NextResponse.json(hand);
  } catch (error) {
    console.error("Error fetching hand:", error);
    return NextResponse.json(
      { error: "Failed to fetch hand" },
      { status: 500 }
    );
  }
}

// DELETE a hand
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existingHand = await db.hand.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingHand) {
      return NextResponse.json({ error: "Hand not found" }, { status: 404 });
    }

    await db.hand.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hand:", error);
    return NextResponse.json(
      { error: "Failed to delete hand" },
      { status: 500 }
    );
  }
}
