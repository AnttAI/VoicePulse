import React, { Suspense } from "react";
import Widget from "./Widget";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";

export default function WidgetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <Widget />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}
