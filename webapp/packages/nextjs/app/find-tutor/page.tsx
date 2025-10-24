"use client";

import { StudentTutorFinder } from "~~/components/student/StudentTutorFinder";

export default function FindTutorPage() {
  const handleSessionStart = (tutorData: any) => {
    console.log("Session starting with tutor:", tutorData);
    // Here you would navigate to the actual video call interface
  };

  return (
    <StudentTutorFinder 
      onSessionStart={handleSessionStart}
    />
  );
}