import type { DomainEvent } from "./domain-event";

export type EventCatalog = Record<string, unknown>;

export type AnyDomainEvent<TEvents extends EventCatalog> = {
  [K in keyof TEvents & string]: DomainEvent<K, TEvents[K]>;
}[keyof TEvents & string];

export type EventHandler<TEvents extends EventCatalog = EventCatalog> = (
  event: AnyDomainEvent<TEvents>,
) => void | Promise<void>;

export interface EventBus<TEvents extends EventCatalog = EventCatalog> {
  publish<K extends keyof TEvents & string>(
    event: DomainEvent<K, TEvents[K]>,
  ): Promise<void>;
  subscribe(channels: string[], handler: EventHandler<TEvents>): () => void;
  subscribeTo<K extends keyof TEvents & string>(
    type: K,
    handler: (event: DomainEvent<K, TEvents[K]>) => void | Promise<void>,
  ): () => void;
}

export function attachSubscribeTo<TEvents extends EventCatalog>(
  subscribe: EventBus<TEvents>["subscribe"],
): EventBus<TEvents>["subscribeTo"] {
  return (type, handler) =>
    subscribe([type], (event) => {
      if (event.type !== type) {
        return;
      }
      return handler(event as DomainEvent<typeof type, TEvents[typeof type]>);
    });
}
