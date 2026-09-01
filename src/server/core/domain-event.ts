import { createId } from "./ids";

export type DomainEvent<TType extends string = string, TPayload = unknown> = {
  id: string;
  type: TType;
  payload: TPayload;
  occurredAt: string;
  channels: string[];
};

export function createDomainEvent<TType extends string, TPayload>(input: {
  type: TType;
  payload: TPayload;
  channels: string[];
}): DomainEvent<TType, TPayload> {
  return {
    id: createId(),
    type: input.type,
    payload: input.payload,
    occurredAt: new Date().toISOString(),
    channels: input.channels,
  };
}
