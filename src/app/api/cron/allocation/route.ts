import { sweepExpiredReservations } from "@/lib/allocation";

// Expire stale first-responder reservations and refill positions.
// Call every minute from a scheduler (Vercel Cron, GitHub Actions, crontab).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const expired = await sweepExpiredReservations();
  return Response.json({ expired });
}
