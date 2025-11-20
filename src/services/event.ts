import { Events } from "../domain/event";
import { ILogger } from "../util/logger";

export interface IEventPublisher {
    Publish(event: string, data: any): void;
    Subscribe(event: string, consumer: (data: any) => void): void;
}

export class DefaultEventService implements IEventPublisher {
    element: any;
    logger: ILogger;

    constructor(element: any, logger: ILogger) {
        this.element = element || window;
        this.logger = logger;
        this.EnableEventDebuging();
    }

    Publish(event: string, data: any): void {
        this.element.dispatchEvent(new CustomEvent(event, {
            detail: data,
            bubbles: true,
            cancelable: true
        }));
    }

    Subscribe(event: string, consumer: (data: any) => void): void {
        this.element.addEventListener(event, consumer);
    }

    private EnableEventDebuging() {
        let debug = (event: any) => this.logger.Debug('(!) Event:', event);

        this.Subscribe(Events.Connected, debug);
        this.Subscribe(Events.Ringing, debug);
        this.Subscribe(Events.Open, debug);
        this.Subscribe(Events.Stream, debug);
        this.Subscribe(Events.Track, debug);
        this.Subscribe(Events.Closed, debug);
        this.Subscribe(Events.Disconnected, debug);
    }
}