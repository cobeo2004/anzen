import { createId } from "./ids";

export type DomainEvent = {
  id: string;
  type: string;
  payload: unknown;
  occurredAt: string;
  channels: string[];
};

export function createDomainEvent(input: {
  type: string;
  payload: unknown;
  channels: string[];
}): DomainEvent {
  return {
    id: createId(),
    type: input.type,
    payload: input.payload,
    occurredAt: new Date().toISOString(),
    channels: input.channels,
  };
}
