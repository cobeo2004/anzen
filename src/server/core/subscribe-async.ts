import type { AnyDomainEvent, EventBus, EventCatalog } from "./event-bus";

export async function* subscribeAsync<TEvents extends EventCatalog>(
  bus: EventBus<TEvents>,
  channels: string[],
  signal?: AbortSignal,
): AsyncGenerator<AnyDomainEvent<TEvents>> {
  const queue: AnyDomainEvent<TEvents>[] = [];
  let notify: (() => void) | undefined;
  let finished = false;

  const unsubscribe = bus.subscribe(channels, (event) => {
    queue.push(event);
    notify?.();
  });

  const onAbort = () => {
    finished = true;
    notify?.();
  };

  signal?.addEventListener("abort", onAbort);

  try {
    while (!finished && !signal?.aborted) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          notify = resolve;
        });
        continue;
      }
      const event = queue.shift();
      if (event) {
        yield event;
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    unsubscribe();
  }
}
