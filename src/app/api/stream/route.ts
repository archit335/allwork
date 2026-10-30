import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Server-Sent Events: pushes unread count + new notifications to the browser.
// Polls Postgres every few seconds; swap for LISTEN/NOTIFY or Redis pub/sub at scale.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const enc = new TextEncoder();
  let since = new Date();
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastCount = -1;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${data}\n\n`));
      const tick = async () => {
        try {
          const [count, fresh] = await Promise.all([
            db.notification.count({ where: { userId: user.id, readAt: null } }),
            db.notification.findMany({ where: { userId: user.id, createdAt: { gt: since } }, orderBy: { createdAt: "asc" }, take: 5 }),
          ]);
          if (count !== lastCount) { send("unread", String(count)); lastCount = count; }
          for (const n of fresh) {
            send("notification", JSON.stringify({ id: n.id, title: n.title, body: n.body, link: n.link }));
            since = n.createdAt;
          }
          controller.enqueue(enc.encode(": ping\n\n"));
        } catch {
          clearInterval(timer);
          try { controller.close(); } catch {}
        }
      };
      await tick();
      timer = setInterval(tick, 4000);
      req.signal.addEventListener("abort", () => { clearInterval(timer); try { controller.close(); } catch {} });
    },
    cancel() { clearInterval(timer); },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
