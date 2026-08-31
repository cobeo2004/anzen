import { createClient, type RedisClientType } from "redis";
import type { DomainEvent } from "@/server/core/domain-event";
import type { EventBus, EventHandler } from "@/server/core/event-bus";

function redisChannel(channel: string) {
  return `anzen:${channel}`;
}

function redisStream(channel: string) {
  return `anzen:stream:${channel}`;
}

function parseEvent(raw: string): DomainEvent | null {
  try {
    const value = JSON.parse(raw) as DomainEvent;
    if (
      typeof value?.id !== "string" ||
      typeof value?.type !== "string" ||
      !Array.isArray(value.channels)
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export class RedisEventBus implements EventBus {
  private readonly publisher: RedisClientType;
  private readonly subscriber: RedisClientType;
  private readonly ready: Promise<void>;

  constructor(url: string) {
    this.publisher = createClient({ url });
    this.subscriber = this.publisher.duplicate();
    this.publisher.on("error", (error) => {
      console.error("Redis EventBus publisher error", error);
    });
    this.subscriber.on("error", (error) => {
      console.error("Redis EventBus subscriber error", error);
    });
    this.ready = Promise.all([
      this.publisher.connect(),
      this.subscriber.connect(),
    ]).then(() => undefined);
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.ready;
    const json = JSON.stringify(event);
    for (const channel of event.channels) {
      await this.publisher.publish(redisChannel(channel), json);
      await this.publisher.xAdd(
        redisStream(channel),
        "*",
        { event: json },
        {
          TRIM: {
            strategy: "MAXLEN",
            strategyModifier: "~",
            threshold: 1000,
          },
        },
      );
    }
  }

  subscribe(channels: string[], handler: EventHandler): () => void {
    const redisChannels = channels.map(redisChannel);
    const listener = (message: string) => {
      const event = parseEvent(message);
      if (!event) {
        return;
      }
      try {
        const result = handler(event);
        if (result) {
          void result.catch((error) => {
            console.error("EventBus subscriber failed", {
              type: event.type,
              error,
            });
          });
        }
      } catch (error) {
        console.error("EventBus subscriber failed", {
          type: event.type,
          error,
        });
      }
    };

    void this.ready.then(async () => {
      for (const channel of redisChannels) {
        await this.subscriber.subscribe(channel, listener);
      }
    });

    return () => {
      void this.ready.then(async () => {
        for (const channel of redisChannels) {
          await this.subscriber.unsubscribe(channel, listener);
        }
      });
    };
  }
}
