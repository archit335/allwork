"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";

async function log(adminId: string, action: string, targetId: string, detail?: string) {
  await db.adminLog.create({ data: { adminId, action, targetId, detail } });
}

export async function reviewVerificationAction(id: string, approve: boolean) {
  const admin = await requireAdmin();
  const v = await db.verification.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", reviewedAt: new Date() } });
  if (approve && v.type === "IDENTITY") await db.user.update({ where: { id: v.userId }, data: { idVerified: true } });
  await notify(v.userId, { type: "VERIFICATION", title: `Verification ${approve ? "approved" : "rejected"}`, body: `Your ${v.type.toLowerCase()} verification was ${approve ? "approved ✓" : "not approved"}.`, link: "/dashboard/profile" });
  await log(admin.id, approve ? "VERIFY_APPROVE" : "VERIFY_REJECT", v.userId, v.type);
  revalidatePath("/admin");
  return { ok: "Updated" };
}

export async function resolveDisputeAction(id: string, resolution: string) {
  const admin = await requireAdmin();
  const d = await db.dispute.update({ where: { id }, data: { status: "RESOLVED", resolution }, include: { booking: true } });
  for (const uid of [d.booking.clientId, d.booking.workerId]) {
    await notify(uid, { type: "DISPUTE", title: "Dispute resolved", body: resolution, link: `/bookings/${d.bookingId}` });
  }
  await log(admin.id, "DISPUTE_RESOLVE", d.id, resolution);
  revalidatePath("/admin");
  return { ok: "Resolved" };
}

export async function closeReportAction(id: string) {
  const admin = await requireAdmin();
  await db.report.update({ where: { id }, data: { status: "CLOSED" } });
  await log(admin.id, "REPORT_CLOSE", id);
  revalidatePath("/admin");
  return { ok: "Closed" };
}
