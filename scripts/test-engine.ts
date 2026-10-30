// End-to-end check of AI parsing, matching and first-responder allocation
// against the local database. Run: npm run test:engine (after npm run seed)
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { parseWithRules } from "../src/lib/ai/rules";
import { ensureSkills } from "../src/lib/skills";
import { dispatchWave } from "../src/lib/matching";
import { acceptRequest, submitProposal, selectProposal, AllocationError } from "../src/lib/allocation";

const today = new Date("2026-11-02T10:00:00"); // a Monday

function check(name: string, fn: () => void) {
  fn();
  console.log(`✓ ${name}`);
}

async function main() {
  // 1. Parser
  const p = parseWithRules("Kal Gurgaon factory mein 10 log chahiye packaging ke liye, 8 ghante, 800 rs per day", today);
  check("Hinglish request parsed", () => {
    assert.equal(p.workersNeeded, 10);
    assert.equal(p.city, "Gurgaon");
    assert.equal(p.date, "2026-11-03");
    assert.equal(p.durationHours, 8);
    assert.equal(p.budgetMin, 800);
    assert.equal(p.budgetUnit, "DAY");
    assert.equal(p.skills[0], "Packaging Worker");
    assert.equal(p.detectedLanguage, "Hinglish");
  });
  const e = parseWithRules("I need an electrician to repair my fan", today);
  check("English request parsed with follow-ups", () => {
    assert.equal(e.skills[0], "Electrician");
    assert.equal(e.workersNeeded, 1);
    assert.ok(e.followUpQuestions.some((q) => q.includes("located")));
  });
  const odd = parseWithRules("Need someone to teach my parrot to talk", today);
  check("Unknown category still produces a job", () => assert.ok(odd.skills.length >= 1));

  // 2. Matching + allocation on a real job
  const client = await db.user.findUniqueOrThrow({ where: { phone: "+919888888888" } });
  const skills = await ensureSkills(["Packaging Worker"], "Industrial");
  const start = new Date(); start.setDate(start.getDate() + 3); start.setHours(0, 0, 0, 0);
  const job = await db.job.create({
    data: {
      clientId: client.id, title: "TEST packaging x2", description: "engine test", category: "Industrial", workType: "DAILY", workersNeeded: 2,
      city: "Gurgaon", lat: 28.4595, lng: 77.0266, startDate: start, startTime: "09:00", durationHours: 8,
      skills: { create: skills.map((s) => ({ skillId: s.id })) },
    },
  });
  try {
    const sent = await dispatchWave(job.id);
    const matches = await db.jobMatch.findMany({ where: { jobId: job.id }, include: { worker: { select: { name: true, city: true } } }, orderBy: { score: "desc" } });
    check(`Matching dispatched to ${sent} workers`, () => {
      assert.ok(sent >= 3, "expected several packaging workers in NCR");
      assert.ok(matches.every((m) => m.worker.city !== "Pune"), "far workers excluded");
    });

    // 3. Concurrent accepts: everyone races for 2 positions
    const results = await Promise.allSettled(matches.map((m) => acceptRequest(job.id, m.workerId)));
    const reserved = results.filter((r) => r.status === "fulfilled" && r.value.status === "reserved").length;
    const waitlisted = results.filter((r) => r.status === "fulfilled" && r.value.status === "waitlisted").length;
    const failed = results.filter((r) => r.status === "rejected");
    check(`Race: ${reserved} reserved, ${waitlisted} waitlisted, ${failed.length} errors`, () => {
      assert.equal(failed.length, 0, String((failed[0] as PromiseRejectedResult | undefined)?.reason));
      assert.equal(reserved, 2);
      assert.equal(waitlisted, matches.length - 2);
    });

    // 4. Proposals + booking + double-booking guard
    const holds = await db.reservation.findMany({ where: { jobId: job.id, status: "HELD" } });
    const proposals: Awaited<ReturnType<typeof submitProposal>>[] = [];
    for (const h of holds) {
      proposals.push(await submitProposal(job.id, h.workerId, { pricingType: "DAILY", rate: 800, extraCharges: 50, availableDate: start, startTime: "09:00", endTime: "17:00" }));
    }
    check("Proposals submitted with totals", () => assert.ok(proposals.every((x) => x.totalEstimate === 850)));
    const booking = await selectProposal(proposals[0]!.id, client.id);
    const block = await db.calendarBlock.findUnique({ where: { bookingId: booking.id } });
    check("Booking created and calendar blocked", () => assert.ok(block && block.type === "BOOKING"));

    // A second job at the same time for the same worker must not be bookable.
    const job2 = await db.job.create({ data: { clientId: client.id, title: "TEST overlap", description: "x", category: "Industrial", workersNeeded: 1, city: "Gurgaon", startDate: start, startTime: "10:00", durationHours: 2, skills: { create: skills.map((s) => ({ skillId: s.id })) } } });
    try {
      await db.jobMatch.create({ data: { jobId: job2.id, workerId: booking.workerId, score: 1, breakdown: {} } });
      await acceptRequest(job2.id, booking.workerId);
      let blocked = false;
      try {
        await submitProposal(job2.id, booking.workerId, { pricingType: "FIXED", rate: 500, extraCharges: 0, availableDate: start, startTime: "10:00", endTime: "12:00" });
      } catch (err) {
        blocked = err instanceof AllocationError;
      }
      check("Double booking prevented", () => assert.ok(blocked));
    } finally {
      await db.job.delete({ where: { id: job2.id } });
    }

    await selectProposal(proposals[1]!.id, client.id);
    const final = await db.job.findUniqueOrThrow({ where: { id: job.id } });
    const leftover = await db.jobMatch.count({ where: { jobId: job.id, status: "WAITLISTED" } });
    check("Job FILLED after all positions hired; waitlist closed", () => {
      assert.equal(final.status, "FILLED");
      assert.equal(leftover, 0);
    });
  } finally {
    await db.job.delete({ where: { id: job.id } });
    await db.notification.deleteMany({ where: { body: { contains: "TEST " } } });
  }
  console.log("\nAll engine checks passed.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
