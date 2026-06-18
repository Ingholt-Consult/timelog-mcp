import type { ToolDef } from "./types.js";
import { runBooking, bodyFromArgs, type WriteMode } from "./preview.js";
import { fetchEmployeeProjection } from "./resourceReads.js";
import { bookWorkloadShape } from "../resourceSchemas.js";

// Missing mode is treated as preview (the SDK defaults it, but be defensive).
function modeOf(args: Record<string, unknown>): WriteMode {
  return args.mode === "execute" ? "execute" : "preview";
}

export const resourceWriteTools: ToolDef[] = [
  {
    name: "book_workload",
    description:
      "Book hours for an Employee (Medarbejder) on a Task (Opgave) over a period — a Booking in the Ressourceplanlægger (preview-and-confirm). mode=preview (default) writes NOTHING; it reads the Employee's Kapacitet for the period and returns it plus the exact payload and a warning that a Booking CANNOT be undone via the API. NOTE: the projection shows capacity only, not already-booked hours, so judge overbooking from context. mode=execute creates the Booking (POST /workload/book) — this may answer asynchronously (202), so a successful call does not guarantee the Booking is already visible. One Booking per call. This is a Booking, distinct from Allokering (a Task's budget hours).",
    inputSchema: bookWorkloadShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runBooking(client, {
        mode: modeOf(args),
        bookPath: "/workload/book",
        body,
        // Synthetic preview: the projection has no employee filter, so fetch the
        // period and surface only the booked Employee's capacity rows.
        previewCapacity: async () => {
          const rows = await fetchEmployeeProjection(client, {
            startDate: body.StartDate as string,
            endDate: body.EndDate as string,
            includeAllEmployees: true,
          });
          return rows.filter((r) => r.UserID === body.EmployeeId);
        },
      });
    },
  },
];
