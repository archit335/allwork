import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { ProfileForm, SkillsManager, VerificationForm } from "@/components/forms/profile-forms";

export const metadata = { title: "Profile & skills" };

export default async function ProfilePage({ searchParams }: PageProps<"/dashboard/profile">) {
  const user = await requireUser("/dashboard/profile");
  const { welcome } = await searchParams;
  const [full, verifications] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, include: { workerProfile: true, skills: { include: { skill: true }, orderBy: { years: "desc" } } } }),
    db.verification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const wp = full.workerProfile;

  return (
    <div className="space-y-8">
      <PageHeader title="Profile & skills" subtitle="Your skills and real work matter more than any degree." action={<Link href={`/workers/${user.id}`} className="text-sm font-semibold text-brand-700">View public profile →</Link>} />
      {welcome ? <Alert tone="emerald"><strong>Welcome to AllWork!</strong> Add your skills below so we can send you matching work. Hiring only? You can skip straight to <Link href="/post" className="font-semibold underline">Post Any Work</Link>.</Alert> : null}

      <Card id="skills" className="scroll-mt-24 p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-bold">My skills</h2>
        <SkillsManager skills={full.skills.map((s) => ({ skillId: s.skillId, name: s.skill.name, years: s.years, level: s.level, isCustom: s.skill.isCustom }))} />
      </Card>

      <Card className="p-5 sm:p-6">
        <ProfileForm
          d={{
            name: full.name, email: full.email ?? "", city: full.city ?? "", area: full.area ?? "", bio: full.bio ?? "", avatarUrl: full.avatarUrl ?? "",
            lat: full.lat, lng: full.lng,
            headline: wp?.headline ?? "", experienceYears: wp?.experienceYears ?? 0, education: wp?.education ?? "",
            languages: wp?.languages.join(", ") ?? "", certifications: wp?.certifications.join(", ") ?? "", portfolioLinks: wp?.portfolioLinks.join("\n") ?? "",
            previousWork: wp?.previousWork ?? "", preferredLocations: wp?.preferredLocations.join(", ") ?? "", workRadiusKm: wp?.workRadiusKm ?? 15,
            remoteOk: wp?.remoteOk ?? false, isAvailable: wp?.isAvailable ?? true, emergencyAvailable: wp?.emergencyAvailable ?? false,
            hourlyRate: wp?.hourlyRate ?? null, dailyRate: wp?.dailyRate ?? null, expectedComp: wp?.expectedComp ?? "", workTypes: wp?.workTypes ?? [],
          }}
        />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">Trust & verification</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={full.phoneVerified ? "emerald" : "slate"}>{full.phoneVerified ? "✓ Phone verified" : "Phone not verified"}</Badge>
          <Badge tone={full.idVerified ? "emerald" : "slate"}>{full.idVerified ? "✓ ID verified" : "ID not verified"}</Badge>
          {verifications.map((v) => <Badge key={v.id} tone={v.status === "APPROVED" ? "emerald" : v.status === "REJECTED" ? "red" : "amber"}>{v.type.toLowerCase()} · {v.status.toLowerCase()}</Badge>)}
        </div>
        <p className="mb-4 mt-3 text-sm text-stone-600">Request verification of your identity, skills or portfolio. Reviewed manually by an admin; document upload will be added with storage integration.</p>
        <VerificationForm />
      </Card>
    </div>
  );
}
