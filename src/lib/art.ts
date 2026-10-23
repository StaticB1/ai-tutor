/** Illustration for a subject: public/illustrations/subject-<slug>.webp (256 px, about 11 KB each). */
export function subjectArt(subject: string): string {
  return `/illustrations/subject-${subject.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}.webp`;
}
