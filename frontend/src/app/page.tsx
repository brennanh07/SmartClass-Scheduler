"use client";
import { Metadata } from "next";
import { useState } from "react";
import CourseInputSection from "./CourseInputSection";
import BreaksInputSection from "./BreaksInputSection";
import PreferencesInputSection from "./PreferencesInputSection";

interface Course {
  subject: string;
  courseNumber: string;
}

interface BreakPeriod {
  startTime: string;
  endTime: string;
}

interface Preferences {
  days: string[];
  timesOfDay: string;
  dayWeight: number;
  timeWeight: number;
}

// export const metadata: Metadata = {
//   title: "Home Page",
// };

export default function Home() {
  const [step, setStep] = useState<number>(1);
  const [courses, setCourses] = useState<Course[]>([
    { subject: "", courseNumber: "" },
  ]);
  const [breaks, setBreaks] = useState<BreakPeriod[]>([
    { startTime: "", endTime: "" },
  ]);
  const [preferences, setPreferences] = useState<Preferences>({
    days: [],
    timesOfDay: "",
    dayWeight: 0.5,
    timeWeight: 0.5,
  });
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  function convertTo24Hour(time: string): string {
    const [timePart, period] = time.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);

    if (period === "PM" && hours < 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:00`;
  }

  const handleGenerateSchedules = () => {
    setIsLoading(true);

    const formattedBreaks = breaks
      .filter((breakPeriod) => breakPeriod.startTime && breakPeriod.endTime)
      .map((breakPeriod) => ({
        begin_time: convertTo24Hour(breakPeriod.startTime),
        end_time: convertTo24Hour(breakPeriod.endTime),
      }));

    const payload = {
      courses: courses.map(
        (course) => `${course.subject}-${course.courseNumber}`
      ),
      breaks: formattedBreaks,
      preferred_days: preferences.days,
      preferred_time: preferences.timesOfDay,
      day_weight: preferences.dayWeight,
      time_weight: preferences.timeWeight,
    };

    console.log("Payload:", payload);

    fetch("http://127.0.0.1:8000/class_scheduler/generate-schedules/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("API Response Data:", data);
        setSchedules(Array.isArray(data) ? data : []);
        setStep(step + 1);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setIsLoading(false);
      });
  };

  return (
    <div
      className="flex flex-col items-center bg-cover bg-center bg-no-repeat bg-slate-200"
      // style={{
      //   backgroundImage: "url('/background-image.jpg')",
      // }}
    >
      <div className="flex justify-center w-full">
        {/* Step 1 - Course Input */}
        <div
          className={`transition-opacity duration-500 ${
            step === 1 ? "opacity-100" : "opacity-0"
          }`}
          style={{ display: step === 1 ? "block" : "none" }}
        >
          <CourseInputSection courses={courses} setCourses={setCourses} />
        </div>

        {/* Step 2 - Breaks Input */}
        <div
          className={`transition-opacity duration-500 ${
            step === 2 ? "opacity-100" : "opacity-0"
          }`}
          style={{ display: step === 2 ? "block" : "none" }}
        >
          <BreaksInputSection breaks={breaks} setBreaks={setBreaks} />
        </div>

        {/* Step 3 - Preferences Input */}
        <div
          className={`transition-opacity duration-500 ${
            step === 3 ? "opacity-100" : "opacity-0"
          }`}
          style={{ display: step === 3 ? "block" : "none" }}
        >
          <PreferencesInputSection
            preferences={preferences}
            setPreferences={setPreferences}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="flex justify-end m-5 space-x-3">
          {step > 1 && (
            <button
              className="btn btn-primary text-white font-main"
              onClick={handlePrevious}
            >
              Previous
            </button>
          )}
          <button
            className="btn btn-secondary text-white"
            onClick={step === 3 ? handleGenerateSchedules : handleNext}
          >
            {step === 3 ? "Generate Schedules" : "Next"}
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="flex justify-center">
          <span className="loading loading-lg text-6xl"></span>
        </div>
      )}

      {/* Step 4 - Generated Schedules */}
      {step === 4 && (
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-main font-bold">Generated Schedules</h2>
          <ul className="list-disc mt-4">
            {schedules.map((schedule, index) => (
              <li key={index} className="text-lg font-main">
                {schedule}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
