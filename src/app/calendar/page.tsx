import { AppLayout } from "@/components/layout/app-layout";
import { CalendarPage } from "@/components/pages/calendar-page";

export default function CalendarRoute() {
  return (
    <main className="flex flex-col h-full">
      <AppLayout>
        <CalendarPage />
      </AppLayout>
    </main>
  );
}
