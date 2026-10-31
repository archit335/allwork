// Demo seed data — clearly fictional people for local development.
// All demo accounts use password: demo1234
import "dotenv/config";
import type { WorkType } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { SKILL_CATALOG } from "../src/lib/skills-catalog";
import { CITIES } from "../src/lib/geo";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type W = { name: string; phone: string; city: string; skills: [string, number][]; headline: string; exp: number; daily?: number; hourly?: number; types?: WorkType[]; remote?: boolean; rating?: [number, number]; done?: number };

const WORKERS: W[] = [
  { name: "Rahul Verma (demo)", phone: "9000000001", city: "Gurgaon", skills: [["Electrician", 4]], headline: "Electrician · house wiring, fans, inverters", exp: 4, hourly: 250, daily: 1200, rating: [4.8, 23], done: 23 },
  { name: "Amit Yadav (demo)", phone: "9000000002", city: "Gurgaon", skills: [["Electrician", 6], ["AC Technician", 3]], headline: "Electrician & AC service", exp: 6, hourly: 300, daily: 1500, rating: [4.9, 41], done: 41 },
  { name: "Mohit Sharma (demo)", phone: "9000000003", city: "Delhi", skills: [["Electrician", 2]], headline: "Electrician — quick home repairs", exp: 2, hourly: 200, daily: 900, rating: [4.5, 8], done: 8 },
  { name: "Sunil Kumar (demo)", phone: "9000000004", city: "Gurgaon", skills: [["Packaging Worker", 3], ["Warehouse Worker", 2]], headline: "Packing & warehouse helper", exp: 3, daily: 750, types: ["DAILY", "ONE_TIME", "WEEKLY"] },
  { name: "Pooja Devi (demo)", phone: "9000000005", city: "Gurgaon", skills: [["Packaging Worker", 2], ["Production Worker", 1]], headline: "Packaging & production line", exp: 2, daily: 700 },
  { name: "Ravi Singh (demo)", phone: "9000000006", city: "Noida", skills: [["Packaging Worker", 1], ["Construction Labourer", 3]], headline: "Labour & packing work", exp: 3, daily: 700 },
  { name: "Deepak Chauhan (demo)", phone: "9000000007", city: "Faridabad", skills: [["Packaging Worker", 4], ["Machine Operator", 2]], headline: "Packing & machine operator", exp: 4, daily: 850 },
  { name: "Imran Khan (demo)", phone: "9000000008", city: "Gurgaon", skills: [["Warehouse Worker", 5], ["Packaging Worker", 2], ["Driver", 3]], headline: "Warehouse, loading & driving", exp: 5, daily: 900 },
  { name: "Neha Gupta (demo)", phone: "9000000009", city: "Delhi", skills: [["Web Developer", 3], ["UI/UX Designer", 2]], headline: "Full-stack web dev · React / Next.js", exp: 3, hourly: 800, types: ["PROJECT", "PART_TIME", "CONTRACT"], remote: true },
  { name: "Arjun Mehta (demo)", phone: "9000000010", city: "Bengaluru", skills: [["Android Developer", 4], ["Software Engineer", 4]], headline: "Android & Flutter developer", exp: 4, hourly: 1000, remote: true },
  { name: "Sana Sheikh (demo)", phone: "9000000011", city: "Mumbai", skills: [["Graphic Designer", 5], ["Video Editor", 2]], headline: "Brand & social media designer", exp: 5, hourly: 600, remote: true },
  { name: "Vikram Joshi (demo)", phone: "9000000012", city: "Pune", skills: [["AI Developer", 2], ["Data Analyst", 3]], headline: "ML engineer · Python, LLM apps", exp: 3, hourly: 1200, remote: true },
  { name: "Lakshmi Iyer (demo)", phone: "9000000013", city: "Jaipur", skills: [["Cook", 8]], headline: "Home & event cook — North/South Indian", exp: 8, daily: 2000 },
  { name: "Ramesh Prajapati (demo)", phone: "9000000014", city: "Noida", skills: [["Plumber", 7]], headline: "Plumber · leaks, fittings, tanks", exp: 7, hourly: 300 },
  { name: "Gopal Mistri (demo)", phone: "9000000015", city: "Pune", skills: [["Construction Labourer", 6], ["Mason", 6]], headline: "Mason & site labour", exp: 6, daily: 800 },
  { name: "Karan Malhotra (demo)", phone: "9000000016", city: "Delhi", skills: [["Carpenter", 9]], headline: "Carpenter · furniture & repairs", exp: 9, daily: 1400 },
];

async function main() {
  for (const s of SKILL_CATALOG) {
    await db.skill.upsert({ where: { slug: slug(s.name) }, update: { category: s.category }, create: { name: s.name, slug: slug(s.name), category: s.category } });
  }
  const hash = await bcrypt.hash("demo1234", 10);

  await db.user.upsert({
    where: { phone: "+919999999999" }, update: { role: "ADMIN" },
    create: { name: "Admin (demo)", phone: "+919999999999", passwordHash: hash, role: "ADMIN", city: "Delhi", phoneVerified: true, workerProfile: { create: {} } },
  });
  const client = await db.user.upsert({
    where: { phone: "+919888888888" }, update: {},
    create: { name: "Priya Factory Owner (demo)", phone: "+919888888888", passwordHash: hash, city: "Gurgaon", lat: CITIES.Gurgaon!.lat, lng: CITIES.Gurgaon!.lng, phoneVerified: true, workerProfile: { create: {} } },
  });

  for (const w of WORKERS) {
    const c = CITIES[w.city]!;
    const user = await db.user.upsert({
      where: { phone: `+91${w.phone}` }, update: {},
      create: {
        name: w.name, phone: `+91${w.phone}`, passwordHash: hash, city: w.city, lat: c.lat + (Math.random() - 0.5) * 0.08, lng: c.lng + (Math.random() - 0.5) * 0.08,
        phoneVerified: true, idVerified: Math.random() > 0.5,
        workerProfile: {
          create: {
            headline: w.headline, experienceYears: w.exp, languages: ["Hindi", "English"], workRadiusKm: 30, remoteOk: !!w.remote,
            hourlyRate: w.hourly, dailyRate: w.daily, workTypes: w.types ?? [], preferredLocations: [w.city],
            ratingAvg: w.rating?.[0] ?? 0, ratingCount: w.rating?.[1] ?? 0, completedJobs: w.done ?? 0, reliabilityScore: 70 + Math.min(25, (w.done ?? 0) * 2) * 0.8,
          },
        },
        weeklySlots: { create: [1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startMin: 8 * 60, endMin: 20 * 60 })) },
      },
    });
    for (const [name, years] of w.skills) {
      const skill = await db.skill.findUniqueOrThrow({ where: { slug: slug(name) } });
      await db.userSkill.upsert({ where: { userId_skillId: { userId: user.id, skillId: skill.id } }, update: {}, create: { userId: user.id, skillId: skill.id, years, level: years >= 5 ? "EXPERT" : "INTERMEDIATE" } });
    }
  }

  if (!(await db.project.count())) {
    const fe = await db.skill.findUniqueOrThrow({ where: { slug: "web-developer" } });
    const ux = await db.skill.findUniqueOrThrow({ where: { slug: "ui-ux-designer" } });
    const ai = await db.skill.findUniqueOrThrow({ where: { slug: "ai-developer" } });
    await db.project.create({
      data: {
        ownerId: client.id, name: "KhetiAI — crop disease detection (demo)", category: "AI / ML", stage: "Prototype", collabType: "EQUITY",
        description: "A mobile-first tool that lets farmers photograph a leaf and get a disease diagnosis in Hindi. We have a working model and need help turning it into a real product.",
        compensationTerms: "1–3% equity each, vesting over 4 years with a 1-year cliff. No salary until funding.", contributorsNeeded: 3, duration: "6 months", workingHours: "10–15 hrs/week",
        responsibilities: "Frontend: build the PWA. Designer: farmer-friendly UI. ML: improve model accuracy.",
        skills: { create: [{ skillId: fe.id }, { skillId: ux.id }, { skillId: ai.id }] },
      },
    });
    await db.project.create({
      data: {
        ownerId: client.id, name: "Open-source Hindi typing tutor (demo)", category: "Open source", stage: "MVP", collabType: "OPEN_SOURCE",
        description: "A free, open-source web app to learn Hindi (Devanagari) typing. MIT licensed, built with Next.js. Looking for contributors for lessons and accessibility.",
        compensationTerms: "No payment. MIT licence; all contributors credited in README and on the site.", contributorsNeeded: 5, workingHours: "Any",
        skills: { create: [{ skillId: fe.id }] },
      },
    });
  }
  console.log("Seeded. Demo password for all accounts: demo1234");
  console.log("  Client: 9888888888 · Admin: 9999999999 · Workers: 9000000001–9000000016");
}

main().finally(() => db.$disconnect());
