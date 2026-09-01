import type { z } from "zod";
import type { DomainEvent } from "@/server/core/domain-event";
import type {
  AnyDomainEvent,
  EventBus,
  EventCatalog,
} from "@/server/core/event-bus";

export type ZodEventCatalog = Record<string, z.ZodType>;

export type InferEventCatalog<T extends ZodEventCatalog> = {
  [K in keyof T]: z.infer<T[K]>;
};

export function createTypedEventBus<TCatalog extends ZodEventCatalog>(
  inner: EventBus,
  catalog: TCatalog,
): EventBus<InferEventCatalog<TCatalog>> {
  type Events = InferEventCatalog<TCatalog>;

  function parse(
    event: DomainEvent,
  ): AnyDomainEvent<Events & EventCatalog> | null {
    const schema = catalog[event.type];
    if (!schema) {
      return null;
    }
    const parsed = schema.safeParse(event.payload);
    if (!parsed.success) {
      return null;
    }
    return {
      ...event,
      payload: parsed.data,
    } as AnyDomainEvent<Events & EventCatalog>;
  }

  return {
    async publish(event) {
      const schema = catalog[event.type];
      if (schema) {
        schema.parse(event.payload);
      }
      await inner.publish(event);
    },
    subscribe(channels, handler) {
      return inner.subscribe(channels, (event) => {
        const typed = parse(event);
        if (!typed) {
          return;
        }
        return handler(typed);
      });
    },
    subscribeTo(type, handler) {
      return inner.subscribe([type], (event) => {
        if (event.type !== type) {
          return;
        }
        const typed = parse(event);
        if (!typed) {
          return;
        }
        return handler(
          typed as DomainEvent<typeof type & string, Events[typeof type]>,
        );
      });
    },
  };
}
