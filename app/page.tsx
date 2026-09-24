import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Features } from "@/components/marketing/features";
import { AITutorSection } from "@/components/marketing/ai-tutor-section";
import { NotesSection } from "@/components/marketing/notes-section";
import { ProgressSection } from "@/components/marketing/progress-section";
import { FlashcardsSection } from "@/components/marketing/flashcards-section";
import { QuizzesSection } from "@/components/marketing/quizzes-section";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { FAQ } from "@/components/marketing/faq";
import { Footer } from "@/components/marketing/footer";

export default function Home() {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <main>
        <Hero />
        <ProductPreview />
        <Features />
        <AITutorSection />
        <NotesSection />
        <ProgressSection />
        <FlashcardsSection />
        <QuizzesSection />
        <HowItWorks />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}