import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET a single session
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

    const pokerSession = await db.session.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!pokerSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(pokerSession);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

// PATCH update a session (add rebuy, end session, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Verify ownership
    const existingSession = await db.session.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Handle rebuy
    if (body.addRebuy !== undefined) {
      updateData.rebuys = [...existingSession.rebuys, parseFloat(body.addRebuy)];
    }

    // Handle end session
    if (body.cashOut !== undefined) {
      updateData.cashOut = parseFloat(body.cashOut);
      updateData.endTime = new Date();
      updateData.isActive = false;
    }

    // Handle tips
    if (body.tips !== undefined) {
      updateData.tips = parseFloat(body.tips);
    }

    // Handle notes
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // Handle location/blinds edits
    if (body.location) updateData.location = body.location;
    if (body.blinds) updateData.blinds = body.blinds;

    const updatedSession = await db.session.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

// DELETE a session
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
    const existingSession = await db.session.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await db.session.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
