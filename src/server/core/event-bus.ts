import type { DomainEvent } from "./domain-event";

export type EventHandler = (event: DomainEvent) => void | Promise<void>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(channels: string[], handler: EventHandler): () => void;
}
