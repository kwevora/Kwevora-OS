const events = [
  {
    time: "1:08 AM",
    title: "Reviewed yesterday's analytics",
    description:
      "KAI compared yesterday's traffic and engagement to identify today's highest-leverage opportunity.",
  },
  {
    time: "2:14 AM",
    title: "Found three content opportunities",
    description:
      "KAI identified topics with the highest chance of attracting new viewers.",
  },
  {
    time: "3:02 AM",
    title: "Prepared today's videos",
    description:
      "Three One Step Closer videos were drafted and queued for approval.",
  },
  {
    time: "4:17 AM",
    title: "Improved product messaging",
    description:
      "KAI refined product copy to better match the content being published today.",
  },
  {
    time: "5:41 AM",
    title: "Built today's game plan",
    description:
      "Today's priorities were organized around the biggest business constraint: traffic.",
  },
];

export default function OvernightTimeline() {
  return (
    <div className="space-y-5">
      {events.map((event) => (
        <div
          key={event.time}
          className="rounded-3xl border border-purple-800 bg-black/40 p-6"
        >
          <p className="text-sm font-bold tracking-widest text-purple-300">
            🌙 {event.time}
          </p>

          <h3 className="mt-2 text-2xl font-black">
            {event.title}
          </h3>

          <p className="mt-3 text-gray-300">
            {event.description}
          </p>
        </div>
      ))}
    </div>
  );
}