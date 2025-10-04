import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Clock } from "lucide-react";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function Index() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-slate-950 dark:bg-[radial-gradient(rgba(255,255,255,.1)_1px,transparent_1px)]">
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span>Koçum Takipte</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Clock className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Koçum Takipte
        </h1>
        <p className="mx-auto mt-4 max-w-[600px] text-muted-foreground md:text-xl">
          Çocuğunuzun ders çalışma sürecini takip etmek için giriş yapın veya kayıt olun.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/login">Giriş Yap / Kayıt Ol</Link>
        </Button>
      </main>
    </div>
  );
}

export default Index;