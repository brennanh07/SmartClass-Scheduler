"use client";
import { Metadata } from "next";
import { useState, useEffect, useRef } from "react";
import CourseInputSection from "./CourseInputSection";
import BreaksInputSection from "./BreaksInputSection";
import PreferencesInputSection from "./PreferencesInputSection";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import momentPlugin from "@fullcalendar/moment";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  Button,
} from "@headlessui/react";
import MyModal from "./EventInfoModal";
import { all } from "axios";
import "./globals.css";

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

interface ClassEvent {
  title: string;
  start: Date | string;
  end: Date | string;
  crn: string;
  // crn: string;
  // location: string;
  // instructor: string;
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
    days: ["M", "T", "W", "R", "F"],
    timesOfDay: "",
    dayWeight: 0.5,
    timeWeight: 0.5,
  });
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerateButtonPressed, setIsGenerateButtonPressed] =
    useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<ClassEvent[][]>([]);
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState<number>(0);
  const [isCRNModalOpen, setIsCRNModalOpen] = useState<boolean>(false);
  const [copiedCRN, setCopiedCRN] = useState<string | null>(null);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const formRefs = [
    useRef<HTMLDivElement>(null), // Course Input Section
    useRef<HTMLDivElement>(null), // Breaks Input Section
    useRef<HTMLDivElement>(null), // Preferences Input Section
  ];

  // useEffect(() => {
  //   setErrorMessage("");
  //   setIsTimeout(false);
  // }, [step]);

  const handleNext = () => {
    setDirection("left"); // Animation direction
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setDirection("right"); // Animation direction
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

  type DayOfWeek = "M" | "T" | "W" | "R" | "F";

  function convertToISODate(day: DayOfWeek, time: string): string {
    const daysOfWeek: Record<DayOfWeek, string> = {
      M: "2099-01-05",
      T: "2099-01-06",
      W: "2099-01-07",
      R: "2099-01-08",
      F: "2099-01-09",
    };
    return `${daysOfWeek[day]}T${convertTo24Hour(time)}`;
  }

  function convertFromISODate(isoDate: string): string {
    const date = new Date(isoDate);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }

  const handleGenerateSchedules = () => {
    if (preferences.dayWeight + preferences.timeWeight !== 1.0) {
      setErrorMessage("Day and Time Weights must add up to 1.0");
      return;
    }

    setIsLoading(true);
    setIsGenerateButtonPressed(true);
    setErrorMessage("");
    setIsTimeout(false);

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
      // testing with the first schedule returned only
      .then((response) => response.json())
      .then((data) => {
        console.log("API Response Data:", data);

        if (data.schedules.length === 0) {
          setErrorMessage(
            "No schedules found. Please remove one or more breaks."
          );
          setIsLoading(false);
          return;
        }

        if (data.schedules[0] === "timeout") {
          setIsTimeout(true);
          setIsLoading(false);
          return;
        }

        const allSchedules: ClassEvent[][] = []; // Initialize an empty array to store the schedules

        data.schedules.forEach((schedule: any) => {
          const scheduleEvents: ClassEvent[] = []; // Initialize an empty array to store the events
          Object.keys(schedule.days).forEach((day) => {
            const dayOfWeek = day as DayOfWeek; // Convert the day to a DayOfWeek type
            schedule.days[dayOfWeek].forEach((classInfo: string) => {
              const [title, timeRange] = classInfo.split(": "); // Split the class info into title and time range
              const [startTime, endTime] = timeRange.split(" - "); // Split the time range into start and end times
              // Push the new event to the array
              scheduleEvents.push({
                title,
                start: convertToISODate(dayOfWeek, startTime),
                end: convertToISODate(dayOfWeek, endTime),
                crn: `${schedule.crns[title.split(": ")[0]]}`,
              });
            });
          });
          allSchedules.push(scheduleEvents); // Push the schedule to the array
        });

        setSchedules(allSchedules);
        setEvents(allSchedules[0]);
        setCurrentScheduleIndex(0);
        setStep(step + 1);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setIsLoading(false);
        setIsTimeout(true);
      });
  };

  const handleNextSchedule = () => {
    const nextIndex = (currentScheduleIndex + 1) % schedules.length; // Calculate the next index based on the current index
    setCurrentScheduleIndex(nextIndex); // Update the current index
    setEvents(schedules[nextIndex]); // Update the events to the next schedule
  };

  const handlePreviousSchedule = () => {
    // Calculate the previous index based on the current index by adding the length of the array to avoid negative values
    const previousIndex =
      (currentScheduleIndex - 1 + schedules.length) % schedules.length;
    setCurrentScheduleIndex(previousIndex); // Update the current index
    setEvents(schedules[previousIndex]); // Update the events to the previous schedule
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent({
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      crn: info.event.extendedProps.crn,
    });
    setIsModalOpen(true);
  };

  // Function to handle the CRN button click
  const handleCRNButtonClick = () => {
    setIsCRNModalOpen(true);
  };

  // Function to copy the CRN to the clipboard
  const handleCopyCRN = (crn: string) => {
    navigator.clipboard.writeText(crn).then(() => {
      // Copy the CRN to the clipboard
      setCopiedCRN(crn); // Set the copied CRN
      setTimeout(() => setCopiedCRN(null), 2000); // Reset after 2 seconds
    });
  };

  // Function to get the CRNs of the current schedule
  const getCurrentScheduleCRNs = () => {
    if (
      schedules.length === 0 ||
      currentScheduleIndex < 0 ||
      currentScheduleIndex >= schedules.length
    ) {
      console.log("No schedules available or invalid index");
      return []; // Return an empty array if there are no schedules or the index is invalid
    }

    const currentSchedule = schedules[currentScheduleIndex];
    if (!currentSchedule || !Array.isArray(currentSchedule)) {
      console.log("Current schedule is not an array");
      return []; // Return an empty array if currentSchedule is not an array
    }

    const uniqueClassesAndCRNs = new Map();

    currentSchedule.forEach((event) => {
      const className = event.title.split(": ")[0]; // Assuming the title format is "SUBJ-NUM: Class Name"
      if (!uniqueClassesAndCRNs.has(className)) {
        uniqueClassesAndCRNs.set(className, event.crn);
      }
    });

    return Array.from(uniqueClassesAndCRNs, ([className, crn]) => ({
      className,
      crn,
    }));
  };

  useEffect(() => {
    const updateSize = () => {
      const currentForm = formRefs[step - 1].current;
      if (currentForm) {
        void currentForm.offsetWidth; // Trigger a reflow to get the updated width

        setContainerSize({
          width: currentForm.offsetWidth + 20,
          height: currentForm.offsetHeight + 20,
        });
      }
    };

    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
      updateSize();
    });

    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, [step, formRefs]);

  return (
    <div
      className="flex flex-col items-center bg-cover bg-center bg-no-repeat bg-slate-200 min-h-screen"
      // style={{
      //   backgroundImage: "url('/background-image.jpg')",
      // }}
    >
      <div className="flex justify-center items-center w-full">
        {/* Navigation Buttons on the Left */}
        {step > 1 && step < 4 ? (
          <button
            className="btn btn-secondary btn-circle text-white font-main"
            onClick={handlePrevious}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
        ) : (
          <div className="" style={{ visibility: "hidden" }}>
            <button className="btn btn-secondary btn-circle text-white font-main">
              Hidden
            </button>
          </div>
        )}

        {/* Input Sections */}
        <div
          className="flex flex-col items-center justify-center text-center relative overflow-hidden"
          style={{
            width: `${containerSize.width}px`,
            height: `${containerSize.height}px`,
            transition: "height 0.3s ease-out",
          }}
        >
          {/* Step 1 - Course Input */}
          <div
            ref={formRefs[0]} // Reference to the Course Input Section
            className={`absolute transition-all duration-300 ease-out ${
              step === 1
                ? "opacity-100 translate-x-0"
                : step < 1
                ? "opacity-0 translate-x-full"
                : "opacity-0 -translate-x-full"
            }`}
          >
            <CourseInputSection courses={courses} setCourses={setCourses} />
          </div>

          {/* Step 2 - Breaks Input */}
          <div
            ref={formRefs[1]} // Reference to the Breaks Input Section
            className={`absolute transition-all duration-300 ease-out ${
              step === 2
                ? "opacity-100 translate-x-0"
                : step < 2
                ? "opacity-0 translate-x-full"
                : "opacity-0 -translate-x-full"
            }`}
          >
            <BreaksInputSection breaks={breaks} setBreaks={setBreaks} />
          </div>

          {/* Step 3 - Preferences Input */}
          <div
            ref={formRefs[2]} // Reference to the Preferences Input Section
            className={`absolute transition-all duration-300 ease-out ${
              step === 3
                ? "opacity-100 translate-x-0"
                : step < 3
                ? "opacity-0 translate-x-full"
                : "opacity-0 -translate-x-full"
            }`}
          >
            <PreferencesInputSection
              preferences={preferences}
              setPreferences={setPreferences}
            />
          </div>
        </div>

        {/* Navigation Buttons on the Right */}
        {step < 3 ? (
          <button
            className="btn btn-secondary btn-circle text-white font-main"
            onClick={handleNext}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        ) : (
          <div className="" style={{ visibility: "hidden" }}>
            <button className="btn btn-secondary btn-circle text-white font-main">
              Hidden
            </button>
          </div>
        )}
      </div>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="flex justify-center">
          <span className="loading loading-lg text-6xl"></span>
        </div>
      )}
      {isTimeout && (
        <div className="flex justify-center">
          <span className="text-lg font-main text-red-500">
            Too many possible schedules. Please add breaks.
          </span>
        </div>
      )}
      {errorMessage && (
        <div className="flex justify-center">
          <span className="text-lg font-main text-red-500">{errorMessage}</span>
        </div>
      )}

      {/* Step 4 - Generated Schedules */}
      {step === 4 && (
        <div className="flex flex-col items-center p-4 -mt-10 -mb-20 w-full">
          <div className="flex justify-between items-center w-full mb-4">
            <div className="w-1/3">
              {" "}
              {/* This empty div helps with centering */}
            </div>
            <span className="text-lg font-main text-center w-1/3 font-bold">
              Schedule {currentScheduleIndex + 1} of {schedules.length}
            </span>
            <div className="w-1/3 flex justify-end">
              <button
                className="btn btn-secondary text-white font-main mr-16"
                onClick={handleCRNButtonClick}
              >
                Copy CRNs
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center w-full">
            <button
              className="btn btn-secondary btn-circle text-white font-main mr-4"
              onClick={handlePreviousSchedule}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <div className="bg-white shadow-xl rounded rounded-xl flex-grow">
              <FullCalendar
                plugins={[
                  dayGridPlugin,
                  timeGridPlugin,
                  interactionPlugin,
                  momentPlugin,
                ]}
                initialView="timeGridWeek"
                initialDate={"2099-01-05"}
                weekends={false}
                headerToolbar={{
                  left: "",
                  center: "",
                  right: "",
                }}
                events={events}
                nowIndicator={true}
                height="auto"
                allDayContent=""
                allDaySlot={false}
                slotMinTime={"08:00:00"}
                slotMaxTime={"23:00:00"}
                titleFormat={"MMMM D, YYYY"}
                dayHeaderFormat={"ddd"}
                eventClick={handleEventClick}
                eventColor="#861F41"
              />
            </div>
            <button
              className="btn btn-secondary btn-circle text-white font-main ml-4"
              onClick={handleNextSchedule}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Steps Indicator UI*/}
      {step !== 4 && (
        <ul className="steps w-1/2 mb-5 font-main font-bold">
          <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Courses</li>
          <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Breaks</li>
          <li className={`step ${step >= 3 ? "step-primary" : ""}`}>
            Preferences
          </li>
        </ul>
      )}

      {/* Generate Schedules Button at the Bottom */}
      {step === 3 && !isGenerateButtonPressed && (
        <div className="w-full flex flex-col items-center mb-5">
          <button
            className="btn btn-secondary text-white font-main text-xl mb-2"
            onClick={handleGenerateSchedules}
          >
            Generate Schedules
          </button>
          {errorMessage && (
            <div className="text-red-500 text-lg font-main">{errorMessage}</div>
          )}
        </div>
      )}

      {/* Event Info Modal */}
      {isModalOpen && selectedEvent && (
        <Dialog
          open={isModalOpen}
          as="div"
          className="relative z-10"
          onClose={() => setIsModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <DialogTitle
                  as="h2"
                  className="font-main text-2xl font-bold mb-4 text-primary"
                >
                  {selectedEvent.title}
                </DialogTitle>
                <p className="mb-2">
                  <strong>Start:</strong>{" "}
                  {convertFromISODate(selectedEvent.start.toString())}
                </p>
                <p className="mb-2">
                  <strong>End:</strong>{" "}
                  {convertFromISODate(selectedEvent.end.toString())}
                </p>
                <p>
                  <strong>CRN:</strong> {selectedEvent.crn}
                </p>
                <div className="mt-4">
                  <Button
                    className="inline-flex items-center gap-2 rounded-md bg-primary py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      )}

      {/* CRN Modal */}
      <Dialog
        open={isCRNModalOpen}
        onClose={() => setIsCRNModalOpen(false)}
        className="relative z-10"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <DialogTitle className="text-xl font-bold mb-4 text-primary font-main">
              CRNs for Current Schedule
            </DialogTitle>
            <div className="space-y-2">
              {getCurrentScheduleCRNs().length > 0 ? (
                getCurrentScheduleCRNs().map(({ className, crn }) => (
                  <div key={crn} className="flex justify-between items-center">
                    <span className="font-medium">
                      {className}: <span className="font-bold">{crn}</span>
                    </span>
                    <button
                      onClick={() => handleCopyCRN(crn)}
                      className="btn btn-sm btn-secondary text-white ml-4"
                    >
                      {copiedCRN === crn ? "Copied!" : "Copy"}
                    </button>
                  </div>
                ))
              ) : (
                <p>No CRNs available for the current schedule.</p>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={() => setIsCRNModalOpen(false)}
                className="btn btn-primary text-white"
              >
                Close
              </button>
              <div className="mt-4 text-center">
                <p className="text-sm">
                  Add CRNs in{" "}
                  <a
                    href="https://vt.collegescheduler.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    Hokie Scheduler
                  </a>
                </p>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
