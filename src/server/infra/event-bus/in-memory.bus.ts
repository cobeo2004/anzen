import type { DomainEvent } from "@/server/core/domain-event";
import type { EventBus, EventHandler } from "@/server/core/event-bus";

export class InMemoryEventBus implements EventBus {
  private readonly channels = new Map<string, Set<EventHandler>>();

  async publish(event: DomainEvent): Promise<void> {
    const notified = new Set<EventHandler>();
    for (const channel of event.channels) {
      const handlers = this.channels.get(channel);
      if (!handlers) {
        continue;
      }
      for (const handler of handlers) {
        if (notified.has(handler)) {
          continue;
        }
        notified.add(handler);
        try {
          await handler(event);
        } catch (error) {
          console.error("EventBus subscriber failed", {
            type: event.type,
            channel,
            error,
          });
        }
      }
    }
  }

  subscribe(channels: string[], handler: EventHandler): () => void {
    for (const channel of channels) {
      const handlers = this.channels.get(channel) ?? new Set<EventHandler>();
      handlers.add(handler);
      this.channels.set(channel, handlers);
    }

    return () => {
      for (const channel of channels) {
        const handlers = this.channels.get(channel);
        if (!handlers) {
          continue;
        }
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.channels.delete(channel);
        }
      }
    };
  }
}
