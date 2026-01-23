import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await db.session.findMany({
      where: {
        userId: session.user.id,
        isActive: false, // Only completed sessions
      },
      orderBy: { startTime: "asc" },
    });

    if (sessions.length === 0) {
      return NextResponse.json({
        totalSessions: 0,
        totalProfit: 0,
        totalHours: 0,
        winRate: 0,
        bestSession: null,
        worstSession: null,
        winningSessionsCount: 0,
        losingSessionsCount: 0,
        profitByLocation: {},
        profitOverTime: [],
      });
    }

    // Calculate stats
    let totalProfit = 0;
    let totalHours = 0;
    let bestSession = sessions[0];
    let worstSession = sessions[0];
    let winningSessionsCount = 0;
    let losingSessionsCount = 0;
    const profitByLocation: Record<string, number> = {};
    const profitOverTime: Array<{ date: string; profit: number; cumulative: number }> = [];
    let cumulativeProfit = 0;

    for (const s of sessions) {
      const totalIn = s.buyIn + s.rebuys.reduce((a, b) => a + b, 0);
      const profit = (s.cashOut || 0) - totalIn - s.tips;
      totalProfit += profit;
      cumulativeProfit += profit;

      if (profit > 0) winningSessionsCount++;
      if (profit < 0) losingSessionsCount++;

      // Calculate hours
      if (s.endTime) {
        const hours = (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }

      // Track best/worst
      const bestProfit = (bestSession.cashOut || 0) - bestSession.buyIn - bestSession.rebuys.reduce((a, b) => a + b, 0) - bestSession.tips;
      const worstProfit = (worstSession.cashOut || 0) - worstSession.buyIn - worstSession.rebuys.reduce((a, b) => a + b, 0) - worstSession.tips;

      if (profit > bestProfit) bestSession = s;
      if (profit < worstProfit) worstSession = s;

      // Profit by location
      if (!profitByLocation[s.location]) {
        profitByLocation[s.location] = 0;
      }
      profitByLocation[s.location] += profit;

      // Profit over time
      profitOverTime.push({
        date: s.startTime.toISOString().split("T")[0],
        profit,
        cumulative: cumulativeProfit,
      });
    }

    const winRate = totalHours > 0 ? totalProfit / totalHours : 0;

    return NextResponse.json({
      totalSessions: sessions.length,
      totalProfit,
      totalHours,
      winRate,
      bestSession: {
        id: bestSession.id,
        date: bestSession.startTime,
        location: bestSession.location,
        profit: (bestSession.cashOut || 0) - bestSession.buyIn - bestSession.rebuys.reduce((a, b) => a + b, 0) - bestSession.tips,
      },
      worstSession: {
        id: worstSession.id,
        date: worstSession.startTime,
        location: worstSession.location,
        profit: (worstSession.cashOut || 0) - worstSession.buyIn - worstSession.rebuys.reduce((a, b) => a + b, 0) - worstSession.tips,
      },
      winningSessionsCount,
      losingSessionsCount,
      profitByLocation,
      profitOverTime,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
