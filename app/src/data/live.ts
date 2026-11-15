import { api, apiBase, onApiBase, Rejected, type RemoteExpense, type RemoteTrip } from './api';
import { setAppState } from './states';

/**
 * Keeps the Lisboa trip in step with the engine when the app is pointed at one
 * (see `data/api.ts`). Everything the app changes goes through one queue:
 * the screen updates at once, the change is sent in order, and when the queue is
 * empty the trip is read again so the engine's figures win. If the engine can't
 * be reached the queue waits and retries, which is what «lo nuevo se enviará al
 * volver» promises.
 */
const TRIP = 'Lisboa 2026';
/** The engine knows people by name; in the app you are «tú». */
export const ME = 'Laura';
const MEMBERS = [ME, 'Ana', 'Luis', 'Marta'];
const RETRY_MS = 5000;

type Op = (tripId: number) => Promise<unknown>;

let tripId: number | null = null;
let onTrip: ((trip: RemoteTrip | null) => void) | null = null;
let running = false;
let loaded = false;
let retry: ReturnType<typeof setTimeout> | null = null;
const queue: Op[] = [];
/** Expenses added from the app, by their local id, once the engine has given them one. */
const created = new Map<string, number>();
/** Engine ids that were deleted: a card kept on screen must not be confirmed by that id again. */
const gone = new Set<number>();

async function run() {
  if (running || !apiBase() || !onTrip) return;
  running = true;
  if (retry) clearTimeout(retry);
  retry = null;
  try {
    if (tripId == null) {
      const found = (await api.trips()).find((t) => t.name === TRIP);
      tripId = found ? found.id : (await api.createTrip(TRIP, MEMBERS)).id;
    }
    while (queue.length) {
      try {
        await queue[0](tripId);
      } catch (e) {
        // The engine said no (the expense is gone, say): drop this change and go on with the rest.
        if (!(e instanceof Rejected)) throw e;
      }
      queue.shift();
    }
    onTrip?.(await api.trip(tripId));
    loaded = true;
    setAppState('normal');
  } catch (e) {
    // A trip that no longer exists is looked up (or made) again next time.
    if (e instanceof Rejected) tripId = null;
    setAppState('sin-conexion');
    retry = setTimeout(run, RETRY_MS);
  } finally {
    running = false;
  }
  // Something was added while the trip was being read.
  if (queue.length && !retry) run();
}

function reset() {
  tripId = null;
  loaded = false;
  queue.length = 0;
  created.clear();
  gone.clear();
  if (retry) clearTimeout(retry);
  retry = null;
}

export const live = {
  on: () => !!apiBase(),

  /**
   * Starts syncing and calls `handler` with the trip every time it is read
   * (with `null` when the app goes back to sample data). Returns how to stop.
   */
  start(handler: (trip: RemoteTrip | null) => void) {
    onTrip = handler;
    const connect = () => {
      reset();
      if (apiBase()) {
        setAppState('cargando');
        run();
      } else {
        setAppState('normal');
        handler(null);
      }
    };
    if (apiBase()) connect();
    const stop = onApiBase(connect);
    return () => {
      stop();
      onTrip = null;
      reset();
    };
  },

  /** Sends a change after the ones before it. Does nothing on sample data. */
  push(op: Op) {
    if (!apiBase()) return;
    queue.push(op);
    run();
  },

  /** Reads the trip again (other people add expenses too). */
  refresh() {
    if (apiBase() && loaded) run();
  },

  /** The engine's id for an expense, if it has one that still exists. */
  idOf(e: { id: string; remoteId?: number }) {
    const id = e.remoteId ?? created.get(e.id);
    return id != null && !gone.has(id) ? id : null;
  },
  remember: (localId: string, remoteId: number) => created.set(localId, remoteId),
  forget: (remoteId: number) => gone.add(remoteId),

  /** Says something to the agent. It answers and may propose expenses, which come back as drafts. */
  async ask(message: string): Promise<{ reply: string; drafts: RemoteExpense[] }> {
    if (tripId == null) throw new Error('No trip yet');
    const answer = await api.chat(tripId, ME, message);
    run();
    return answer;
  },
};
