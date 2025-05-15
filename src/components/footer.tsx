import { Brain } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="py-6 md:px-8 md:py-0 border-t">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary" />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Mentos 2.0 &copy; {new Date().getFullYear()}. Built with modern tech.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground md:text-left">
          Designed by an expert.
        </p>
      </div>
    </footer>
  );
}
